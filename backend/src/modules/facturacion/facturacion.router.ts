import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { withBusinessTransaction } from '../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../auditoria/service.js';
import { requireRoles } from '../auth/middleware.js';
import { requestContext } from '../../shared/request-context.js';
import { AppError } from '../../shared/errors.js';
import { routeParam } from '../../api/shared/params.js';

const resolucionFacturaSchema = z.object({ motivoRechazo: z.string().trim().min(1).max(500).optional() });

export function createFacturacionRouter(internal: RequestHandler[]): Router {
  const router = Router(); router.use(...internal, requireRoles('finanzas'));
  router.post('/solicitudes/:id/aceptar', async (request, response, next) => {
    try { const context = requestContext(request); const solicitudId = routeParam(request.params.id, 'id'); const data = await withBusinessTransaction(context, async (tx) => { const solicitud = await tx.solicitudFactura.findUniqueOrThrow({ where: { id: solicitudId } }); if (solicitud.estado !== 'PENDIENTE_REVISION') throw new AppError(409, 'REQUEST_ALREADY_RESOLVED', 'La solicitud ya fue resuelta'); await tx.cobro.update({ where: { id: solicitud.cobroId }, data: { requiereFactura: true } }); const factura = await tx.factura.create({ data: { cobroId: solicitud.cobroId, receptorRfc: solicitud.receptorRfc, receptorNombre: solicitud.receptorNombre, receptorCp: solicitud.receptorCp, receptorRegimen: solicitud.receptorRegimen, usoCfdi: solicitud.usoCfdi, idempotencyKey: randomUUID() } }); const resuelta = await tx.solicitudFactura.update({ where: { id: solicitud.id }, data: { estado: 'ACEPTADA', facturaId: factura.id, resueltaPorId: context.actorId, resueltaAt: new Date() } }); await auditarUsuario(tx, context, { entidad: 'solicitud_factura', entidadId: solicitud.id, accion: 'ACEPTAR', estadoAnterior: solicitud.estado, estadoNuevo: resuelta.estado, detalle: { facturaId: factura.id } }); return { solicitud: resuelta, factura }; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  router.post('/solicitudes/:id/rechazar', async (request, response, next) => {
    try { const input = resolucionFacturaSchema.parse(request.body); if (!input.motivoRechazo) throw new AppError(422, 'VALIDATION_ERROR', 'Debe indicar el motivo de rechazo'); const context = requestContext(request); const solicitudId = routeParam(request.params.id, 'id'); const data = await withBusinessTransaction(context, async (tx) => { const solicitud = await tx.solicitudFactura.findUniqueOrThrow({ where: { id: solicitudId } }); if (solicitud.estado !== 'PENDIENTE_REVISION') throw new AppError(409, 'REQUEST_ALREADY_RESOLVED', 'La solicitud ya fue resuelta'); const resuelta = await tx.solicitudFactura.update({ where: { id: solicitud.id }, data: { estado: 'RECHAZADA', motivoRechazo: input.motivoRechazo, resueltaPorId: context.actorId, resueltaAt: new Date() } }); await auditarUsuario(tx, context, { entidad: 'solicitud_factura', entidadId: solicitud.id, accion: 'RECHAZAR', estadoAnterior: solicitud.estado, estadoNuevo: resuelta.estado }); return resuelta; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  return router;
}
