import { Router, type RequestHandler } from 'express';
import { crearTramiteSchema, listarTramitesSchema } from '@gsts/contracts';
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

const isTramiteState = new Set(['EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'FINALIZADO']);

const ESTADOS_TRAMITE = ['CAPTURA', 'EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'COBRO', 'FINALIZADO'] as const;

/** Desglose por estado con todos los estados presentes: el frontend no defiende `undefined`. */
function porEstadoCompleto(grupos: { estado: EstadoTramite; _count: number }[]): Record<string, number> {
  const conteo = Object.fromEntries(ESTADOS_TRAMITE.map((estado) => [estado, 0]));
  for (const grupo of grupos) conteo[grupo.estado] = grupo._count;
  return conteo;
}

export function createTramitesRouter(internal: RequestHandler[], env: Env): Router {
  const router = Router(); router.use(...internal);
  const verificador = crearVerificadorTokens(env);
  router.get('/', async (request, response, next) => {
    try {
      const { take, cursor, estado, tipoConstancia, nis, folio, desde, hasta } = listarTramitesSchema.parse(request.query);
      // El folio es excluyente: identifica un trámite concreto, así que manda
      // sobre el resto de los filtros en vez de intersectarse con ellos.
      const whereFolio = folio ? whereDeFolio(folio) : undefined;
      if (folio && !whereFolio) throw new AppError(422, 'VALIDATION_ERROR', 'El folio no tiene un formato reconocible (ej. NA-2026-02038)');
      // whereBase excluye `estado` a propósito: alimenta el desglose por estado,
      // que dejaría de serlo si se filtrara por uno solo.
      const whereBase: Prisma.TramiteWhereInput = whereFolio ?? {
        ...(tipoConstancia ? { tipoConstancia } : {}),
        ...(nis ? { nis: { contains: nis, mode: 'insensitive' } } : {}),
        ...(desde || hasta ? { createdAt: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) } } : {}),
      };
      const where: Prisma.TramiteWhereInput = whereFolio ?? { ...whereBase, ...(estado ? { estado } : {}) };
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
    try { const input = crearTramiteSchema.parse(request.body); const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const version = await tx.versionCatalogo.findFirst({ where: { activa: true, publicada: true }, select: { id: true } }); if (!version) throw new AppError(409, 'NO_ACTIVE_CATALOG', 'No existe un catálogo activo para crear el trámite'); const tramite = await tx.tramite.create({ data: { ...input, versionCatalogoId: version.id, creadoPorId: context.actorId, personas: { create: input.personas } }, include: { personas: true } }); await auditarUsuario(tx, context, { entidad: 'tramite', entidadId: tramite.id, accion: 'CREAR', estadoNuevo: 'CAPTURA' }); return tramite; }); response.status(201).json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  router.get('/:id', async (request, response, next) => {
    // urlVerificacion es derivada, no columna: se reconstruye con la versión de
    // clave con la que nació la constancia para que coincida con el QR impreso.
    try { const data = await prisma.tramite.findUnique({ where: { id: routeParam(request.params.id, 'id') }, include: { personas: { include: { persona: true } }, evidencias: true, validacionesNoAdeudo: true, validacionesNoRegistro: true, confirmaciones: true, cobro: true, constancia: true } }); if (!data) throw new AppError(404, 'NOT_FOUND', 'Trámite no encontrado'); response.json({ data: { ...data, constancia: data.constancia ? { ...data.constancia, urlVerificacion: verificador.urlVerificacion(data.constancia.folioUnico, data.constancia.versionToken) } : null }, requestId: request.id }); } catch (error) { next(error); }
  });
  router.post('/:id/:accion', requireRoles('ventanilla'), async (request, response, next) => {
    try { const stateByAction: Record<string, string> = { 'iniciar-validacion': 'EN_VALIDACION', aprobar: 'APROBADO', rechazar: 'RECHAZADO', expirar: 'EXPIRADO', finalizar: 'FINALIZADO' }; const tramiteId = routeParam(request.params.id, 'id'); const nextState = stateByAction[routeParam(request.params.accion, 'accion')]; if (!nextState || !isTramiteState.has(nextState)) throw new AppError(404, 'NOT_FOUND', 'Acción no encontrada'); const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const previous = await tx.tramite.findUniqueOrThrow({ where: { id: tramiteId }, select: { estado: true } }); const tramite = await tx.tramite.update({ where: { id: tramiteId }, data: { estado: nextState as never, motivoRechazo: nextState === 'RECHAZADO' ? String(request.body?.motivo ?? '') : undefined } }); await auditarUsuario(tx, context, { entidad: 'tramite', entidadId: tramite.id, accion: 'TRANSICION_ESTADO', estadoAnterior: previous.estado, estadoNuevo: tramite.estado }); return tramite; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  return router;
}
