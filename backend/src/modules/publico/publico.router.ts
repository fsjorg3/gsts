import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { solicitudFacturaPublicaSchema } from '@sicef/contracts';
import type { Env } from '../../config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { crearVerificadorTokens } from '../../infrastructure/verificacion/token.js';
import { AppError } from '../../shared/errors.js';
import { routeParam } from '../../api/shared/params.js';
import { resolverVerificacion, type ConstanciaVerificable } from './verificacion.js';

const consultaFacturaSchema = z.object({ rfc: z.string().trim().min(12).max(13) });

// Intento contra un folio que no existe (o cuyo token no cuadra): no hay
// entidad real que referenciar y bitacora.entidad_id es NOT NULL uuid. Mismo
// recurso que ya usa ConfiguracionPlazos (…0001) para su fila singleton.
const CENTINELA_FOLIO_DESCONOCIDO = '00000000-0000-0000-0000-000000000002';

export function createPublicoRouter(env: Env): Router {
  const router = Router();
  const verificador = crearVerificadorTokens(env);

  // Cupo propio, además del global de /public: el token va truncado a 80 bits y
  // la respuesta expone titular y domicilio, así que este limitador es lo que
  // separa una fuerza bruta de una fuga de datos personales.
  const limitarVerificacion = rateLimit({
    windowMs: env.VERIFICACION_RATE_LIMIT_WINDOW_MS,
    limit: env.VERIFICACION_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  router.post('/facturas/solicitudes', async (request, response, next) => {
    try { const input = solicitudFacturaPublicaSchema.parse(request.body); const data = await prisma.$transaction(async (tx) => { const constancia = await tx.constancia.findUnique({ where: { folioUnico: input.folio }, include: { tramite: { include: { cobro: true } } } }); if (!constancia?.tramite.cobro) throw new AppError(404, 'NOT_FOUND', 'Constancia no encontrada'); const solicitud = await tx.solicitudFactura.create({ data: { ...input, cobroId: constancia.tramite.cobro.id, fechaLimite: new Date(0) } }); await tx.bitacora.create({ data: { origen: 'PORTAL', entidad: 'solicitud_factura', entidadId: solicitud.id, accion: 'CREAR', ipAddress: request.ip, userAgent: request.header('user-agent') ?? 'unknown', requestId: randomUUID() } }); return solicitud; }); response.status(201).json({ data }); } catch (error) { next(error); }
  });
  // Consulta pública de CFDI: exige folio + RFC. No expone detalle técnico de timbrado.
  // El XML/PDF sólo aparece cuando el worker de timbrado (fuera de alcance) los generó.
  router.get('/facturas/:folio', async (request, response, next) => {
    try {
      const { rfc } = consultaFacturaSchema.parse(request.query);
      const constancia = await prisma.constancia.findUnique({ where: { folioUnico: request.params.folio }, include: { tramite: { include: { cobro: { include: { factura: { include: { archivos: true } } } } } } } });
      const factura = constancia?.tramite.cobro?.factura;
      if (!factura || (factura.receptorRfc ?? '').toUpperCase() !== rfc.toUpperCase()) throw new AppError(404, 'NOT_FOUND', 'No se encontró una factura para el folio y RFC proporcionados');
      await prisma.bitacora.create({ data: { origen: 'PORTAL', entidad: 'factura', entidadId: factura.id, accion: 'CONSULTAR', ipAddress: request.ip ?? '0.0.0.0', userAgent: request.header('user-agent') ?? 'unknown', requestId: randomUUID() } });
      const activos = factura.archivos.filter((archivo) => archivo.conservacion === 'ACTIVO');
      const referencia = (tipo: string) => { const encontrado = activos.find((archivo) => archivo.tipo === tipo); return encontrado ? { archivoUuid: encontrado.archivoUuid, mimeType: encontrado.mimeType } : undefined; };
      const xml = referencia('XML'); const pdf = referencia('PDF');
      response.json({ data: { estado: factura.estado, uuid: factura.uuid ?? undefined, xml, pdf, disponible: Boolean(xml && pdf) } });
    } catch (error) { next(error); }
  });
  // Verificación por QR. El token funciona como capacidad: sólo quien tiene el
  // documento impreso puede consultarlo. No existe ruta equivalente sin token
  // —sería enumerable, porque el folio lleva el consecutivo del trámite.
  router.get('/constancias/:folio/verificar/:token', limitarVerificacion, async (request, response, next) => {
    try {
      const folio = routeParam(request.params.folio, 'folio');
      const tokenValido = verificador.verificarToken(folio, routeParam(request.params.token, 'token'));

      // Se consulta incluso con token inválido para que el tiempo de respuesta
      // no delate qué folios existen. El select trae sólo lo que puede salir:
      // rfc, ids internos, nis y hashes quedan fuera desde la consulta, no sólo
      // del DTO — mismo criterio que SELECT_BITACORA.
      const fila = await prisma.constancia.findUnique({
        where: { folioUnico: folio },
        select: {
          id: true,
          folioUnico: true,
          vigenciaFin: true,
          anulada: true,
          tramite: {
            select: {
              tipoConstancia: true,
              domicilioCalle: true,
              domicilioNumero: true,
              domicilioColonia: true,
              domicilioPerteneceA: true,
              domicilioPerteneceANombre: true,
              // Sólo el titular: representante, apoderado y receptor fiscal
              // nunca se exponen en una ruta pública.
              personas: { where: { rol: 'TITULAR' }, select: { persona: { select: { nombreRazonSocial: true } } }, take: 1 },
            },
          },
        },
      });

      const titular = fila?.tramite.personas[0]?.persona.nombreRazonSocial;
      const constancia: ConstanciaVerificable | null = fila && titular
        ? {
            folioUnico: fila.folioUnico,
            vigenciaFin: fila.vigenciaFin,
            anulada: fila.anulada,
            tipoConstancia: fila.tramite.tipoConstancia,
            titularNombreRazonSocial: titular,
            domicilio: {
              calle: fila.tramite.domicilioCalle,
              numero: fila.tramite.domicilioNumero,
              colonia: fila.tramite.domicilioColonia,
              perteneceA: fila.tramite.domicilioPerteneceA,
              perteneceANombre: fila.tramite.domicilioPerteneceANombre,
            },
          }
        : null;

      const resultado = resolverVerificacion(constancia, tokenValido, new Date());

      await prisma.bitacora.create({
        data: {
          origen: 'PORTAL',
          entidad: 'constancia',
          entidadId: resultado.status === 200 && fila ? fila.id : CENTINELA_FOLIO_DESCONOCIDO,
          accion: 'VERIFICAR_QR',
          ipAddress: request.ip ?? '0.0.0.0',
          userAgent: request.header('user-agent') ?? 'unknown',
          requestId: randomUUID(),
          detalle: { folioIntentado: folio, resultado: resultado.status === 200 ? 'VALIDO' : tokenValido ? 'FOLIO_INEXISTENTE' : 'TOKEN_INVALIDO' },
        },
      });

      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });
  return router;
}
