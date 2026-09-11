import { Router, type RequestHandler } from 'express';
import { crearTramiteSchema, exportarTramitesSchema, listarTramitesSchema } from '@gsts/contracts';
import type { EstadoTramite, Prisma } from '@prisma/client';
import type { Env } from '../../../config/env.js';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';
import { whereDeFolio } from './folio.js';
import { generarExportTramites } from './export.js';
import { requierePadronOfflineManual } from './padron-manual.js';
import { calcularRequiereRevalidacionCobro } from './revalidacion-cobro.js';

const isTramiteState = new Set(['EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'FINALIZADO']);

const ESTADOS_TRAMITE = ['CAPTURA', 'EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'COBRO', 'FINALIZADO'] as const;

/** Desglose por estado con todos los estados presentes: el frontend no defiende `undefined`. */
function porEstadoCompleto(grupos: { estado: EstadoTramite; _count: number }[]): Record<string, number> {
  const conteo = Object.fromEntries(ESTADOS_TRAMITE.map((estado) => [estado, 0]));
  for (const grupo of grupos) conteo[grupo.estado] = grupo._count;
  return conteo;
}

interface FiltrosTramite {
  estado?: EstadoTramite | undefined;
  tipoConstancia?: 'NO_ADEUDO' | 'NO_REGISTRO' | undefined;
  nis?: string | undefined;
  folio?: string | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
}

/**
 * Arma el `where` compartido por `GET /` y `GET /export`: mismo vocabulario de
 * filtro para que jefatura pueda exportar exactamente lo que ventanilla ve
 * listado. `whereBase` excluye `estado` a propósito — lo usa el desglose por
 * estado de `GET /`, que dejaría de ser un desglose si se filtrara por uno
 * solo — y `where` es el filtro completo, el que de verdad se aplica a la
 * consulta o a la exportación.
 *
 * El folio es excluyente: identifica un trámite concreto, así que manda sobre
 * el resto de los filtros en vez de intersectarse con ellos. Devuelve `null`
 * cuando el folio no tiene un formato reconocible, para que el router lo
 * rechace en vez de degradar a un listado sin filtrar.
 */
function whereDeListado(filtros: FiltrosTramite): { where: Prisma.TramiteWhereInput; whereBase: Prisma.TramiteWhereInput } | null {
  const { estado, tipoConstancia, nis, folio, desde, hasta } = filtros;
  const whereFolio = folio ? whereDeFolio(folio) : undefined;
  if (folio && !whereFolio) return null;
  const whereBase: Prisma.TramiteWhereInput = whereFolio ?? {
    ...(tipoConstancia ? { tipoConstancia } : {}),
    ...(nis ? { nis: { contains: nis, mode: 'insensitive' } } : {}),
    ...(desde || hasta ? { createdAt: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) } } : {}),
  };
  const where: Prisma.TramiteWhereInput = whereFolio ?? { ...whereBase, ...(estado ? { estado } : {}) };
  return { where, whereBase };
}

// Límite de filas de GET /tramites/export: es una salvaguarda de ese endpoint,
// no una regla de negocio del dominio, por eso vive aquí y no en el contrato.
// Superarlo pide acotar el filtro en vez de truncar en silencio.
const MAX_FILAS_EXPORT = 10_000;
// entidad_id de Bitacora es UUID estricto (schema.prisma) y una exportación no
// tiene una única entidad a la que atarse: mismo precedente que el singleton
// de ConfiguracionPlazos (ver PENDIENTES_BACKEND_FRONTEND.md).
const ENTIDAD_ID_EXPORT_TRAMITES = '00000000-0000-0000-0000-000000000002';

export function createTramitesRouter(internal: RequestHandler[], env: Env): Router {
  const router = Router(); router.use(...internal);
  const verificador = crearVerificadorTokens(env);
  router.get('/', async (request, response, next) => {
    try {
      const filtros = listarTramitesSchema.parse(request.query);
      const resultado = whereDeListado(filtros);
      if (!resultado) throw new AppError(422, 'VALIDATION_ERROR', 'El folio no tiene un formato reconocible (ej. NA-2026-02038)');
      const { where, whereBase } = resultado;
      const { take, cursor } = filtros;
      const [data, total, grupos] = await Promise.all([
        prisma.tramite.findMany({
          where,
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.tramite.count({ where }),
        prisma.tramite.groupBy({ by: ['estado'], where: whereBase, _count: true }),
      ]);
      const nextCursor = data.length > take ? data.pop()?.id : undefined;
      response.json({ data, meta: { nextCursor, total, porEstado: porEstadoCompleto(grupos) }, requestId: request.id });
    } catch (error) {
      next(error);
    }
  });
  router.post('/', requireRoles('ventanilla'), async (request, response, next) => {
    try {
      const input = crearTramiteSchema.parse(request.body);
      const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const version = await tx.versionCatalogo.findFirst({ where: { activa: true, publicada: true }, select: { id: true } });
        if (!version) throw new AppError(409, 'NO_ACTIVE_CATALOG', 'No existe un catálogo activo para crear el trámite');
        const tramite = await tx.tramite.create({
          data: { ...input, versionCatalogoId: version.id, creadoPorId: context.actorId, personas: { create: input.personas } },
          include: { personas: true },
        });
        // No Adeudo con NIS que no estaba en el catálogo offline del padrón: lo
        // que ventanilla acaba de capturar a mano se agrega, para que el
        // próximo GET /padron/:nis lo resuelva. Sin bitácora aparte: la entrada
        // CREAR de abajo ya cubre esta mutación (mismo criterio que el resto
        // de la transacción).
        if (requierePadronOfflineManual(input)) {
          const existente = await tx.padronOffline.findUnique({ where: { nis: input.nis }, select: { nis: true } });
          if (!existente) {
            const titular = input.personas.find((persona) => persona.rol === 'TITULAR');
            const persona = titular ? await tx.persona.findUnique({ where: { id: titular.personaId }, select: { nombreRazonSocial: true } }) : null;
            // Sin persona TITULAR en el payload no hay nombre que sugerir a
            // futuro: se omite el alta en vez de inventar un propietario.
            if (persona) {
              await tx.padronOffline.create({
                data: {
                  nis: input.nis,
                  propietario: persona.nombreRazonSocial,
                  domicilioCalle: input.domicilioCalle,
                  domicilioNumero: input.domicilioNumero,
                  domicilioColonia: input.domicilioColonia,
                  domicilioPerteneceA: input.domicilioPerteneceA ?? null,
                  domicilioPerteneceANombre: input.domicilioPerteneceANombre ?? null,
                  origen: 'CAPTURADO_MANUAL',
                },
              });
            }
          }
        }
        await auditarUsuario(tx, context, { entidad: 'tramite', entidadId: tramite.id, accion: 'CREAR', estadoNuevo: 'CAPTURA' });
        return tramite;
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  // Antes de '/:id': si no, Express leería "export" como el parámetro `id`.
  // Rol `jefatura` exclusivamente — es un client role (ver rolesCliente en
  // @gsts/contracts), así que un `jefatura` puesto por error en el realm no
  // habilita nada (resolveGstsClaims lo descarta antes de llegar aquí).
  router.get('/export', requireRoles('jefatura'), async (request, response, next) => {
    try {
      const filtros = exportarTramitesSchema.parse(request.query);
      const resultado = whereDeListado(filtros);
      if (!resultado) throw new AppError(422, 'VALIDATION_ERROR', 'El folio no tiene un formato reconocible (ej. NA-2026-02038)');
      const { where } = resultado;

      const total = await prisma.tramite.count({ where });
      if (total > MAX_FILAS_EXPORT) {
        throw new AppError(
          409,
          'EXPORT_TOO_LARGE',
          `El filtro reúne ${total} trámites; el máximo por exportación es ${MAX_FILAS_EXPORT}. Acota el rango de fechas o el estado.`,
        );
      }

      const tramites = await prisma.tramite.findMany({
        where,
        include: { personas: { include: { persona: true } }, cobro: true, constancia: true },
        orderBy: { createdAt: 'desc' },
      });
      // El archivo se arma fuera de la transacción: es lectura pura y no debe
      // mantener una transacción abierta mientras exceljs serializa. La
      // transacción se abre después, sólo para la línea de bitácora.
      const archivo = await generarExportTramites(tramites);

      const context = requestContext(request);
      await withBusinessTransaction(context, (tx) =>
        auditarUsuario(tx, context, {
          entidad: 'tramite',
          entidadId: ENTIDAD_ID_EXPORT_TRAMITES,
          accion: 'EXPORTAR',
          detalle: { filtros, totalFilas: tramites.length },
        }),
      );

      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader('Content-Disposition', `attachment; filename="tramites-${new Date().toISOString().slice(0, 10)}.xlsx"`);
      response.send(archivo);
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (request, response, next) => {
    // urlVerificacion es derivada, no columna: se reconstruye con la versión de
    // clave con la que nació la constancia para que coincida con el QR impreso.
    try {
      const data = await prisma.tramite.findUnique({ where: { id: routeParam(request.params.id, 'id') }, include: { personas: { include: { persona: true } }, evidencias: true, validacionesNoAdeudo: true, validacionesNoRegistro: true, confirmaciones: true, cobro: true, constancia: true } });
      if (!data) throw new AppError(404, 'NOT_FOUND', 'Trámite no encontrado');
      const plazos = await prisma.configuracionPlazos.findUnique({ where: { id: 'PLAZOS_OPERATIVOS' } });
      const requiereRevalidacionCobro = calcularRequiereRevalidacionCobro({ estado: data.estado, aprobadoEn: data.aprobadoEn, graciaMinutos: plazos?.revalidacionGraciaMinutos ?? 0, configuracionActiva: plazos?.activa ?? false });
      response.json({ data: { ...data, requiereRevalidacionCobro, constancia: data.constancia ? { ...data.constancia, urlVerificacion: verificador.urlVerificacion(data.constancia.folioUnico, data.constancia.versionToken) } : null }, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.post('/:id/:accion', requireRoles('ventanilla'), async (request, response, next) => {
    try { const stateByAction: Record<string, string> = { 'iniciar-validacion': 'EN_VALIDACION', aprobar: 'APROBADO', rechazar: 'RECHAZADO', expirar: 'EXPIRADO', finalizar: 'FINALIZADO' }; const tramiteId = routeParam(request.params.id, 'id'); const nextState = stateByAction[routeParam(request.params.accion, 'accion')]; if (!nextState || !isTramiteState.has(nextState)) throw new AppError(404, 'NOT_FOUND', 'Acción no encontrada'); const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const previous = await tx.tramite.findUniqueOrThrow({ where: { id: tramiteId }, select: { estado: true } }); const tramite = await tx.tramite.update({ where: { id: tramiteId }, data: { estado: nextState as never, motivoRechazo: nextState === 'RECHAZADO' ? String(request.body?.motivo ?? '') : undefined } }); await auditarUsuario(tx, context, { entidad: 'tramite', entidadId: tramite.id, accion: 'TRANSICION_ESTADO', estadoAnterior: previous.estado, estadoNuevo: tramite.estado }); return tramite; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  return router;
}
