import { Router, type RequestHandler } from 'express';
import { crearTramiteSchema, listarTramitesSchema } from '@gsts/contracts';
import type { Prisma } from '@prisma/client';
import type { Env } from '../../../config/env.js';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';

const isTramiteState = new Set(['EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'FINALIZADO']);

export function createTramitesRouter(internal: RequestHandler[], env: Env): Router {
  const router = Router(); router.use(...internal);
  const verificador = crearVerificadorTokens(env);
  router.get('/', async (request, response, next) => {
    try {
      const { take, cursor, estado, tipoConstancia, nis, desde, hasta } = listarTramitesSchema.parse(request.query);
      const where: Prisma.TramiteWhereInput = {
        ...(estado ? { estado } : {}),
        ...(tipoConstancia ? { tipoConstancia } : {}),
        ...(nis ? { nis: { contains: nis, mode: 'insensitive' } } : {}),
        ...(desde || hasta ? { createdAt: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) } } : {}),
      };
      const data = await prisma.tramite.findMany({
        where,
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
      });
      const nextCursor = data.length > take ? data.pop()?.id : undefined;
      response.json({ data, meta: { nextCursor }, requestId: request.id });
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
