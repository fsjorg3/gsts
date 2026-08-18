import { Router } from 'express';
import { z } from 'zod';
import { withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requestContext } from '../../../shared/request-context.js';
import { routeParam } from '../../../api/shared/params.js';
import { resolverMotivoReduccion } from './motivo-reduccion.js';

const comprobanteSchema = z.object({ base64: z.string().min(1), nombreOriginal: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(100) });
const schema = z.object({ tarifaId: z.string().uuid(), motivoReduccionId: z.string().uuid().nullable().optional(), formaPago: z.string().trim().min(1).max(10), metodoPago: z.enum(['PUE', 'PPD']), moneda: z.literal('MXN').default('MXN'), facturaSolicitadaEnVentanilla: z.boolean().default(false), referenciaPago: z.string().trim().min(1).max(255).optional(), comprobante: comprobanteSchema.optional() });

export function createCobrosRouter(storage: NfsStorage): Router {
  const router = Router({ mergeParams: true });
  router.post('/', async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = schema.parse(request.body);
      const context = requestContext(request);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      if (input.comprobante) archivo = await storage.save('comprobantes', Buffer.from(input.comprobante.base64, 'base64'));
      const data = await withBusinessTransaction(context, async (tx) => {
        const tarifa = await tx.tarifa.findUniqueOrThrow({ where: { id: input.tarifaId } });
        const { motivoReduccionId, porcentajeReduccion } = await resolverMotivoReduccion(tx, input.motivoReduccionId);
        const montoBase = Number(tarifa.monto);
        const montoFinal = Number((montoBase * (1 - porcentajeReduccion / 100)).toFixed(2));
        const cobro = await tx.cobro.create({
          data: {
            tramiteId, tarifaId: tarifa.id, montoBase, motivoReduccionId, porcentajeReduccion, montoFinal,
            formaPago: input.formaPago, metodoPago: input.metodoPago, moneda: input.moneda, facturaSolicitadaEnVentanilla: input.facturaSolicitadaEnVentanilla, referenciaPago: input.referenciaPago,
            ...(archivo ? { comprobanteArchivoUuid: archivo.archivoUuid, comprobanteNombreOriginal: input.comprobante!.nombreOriginal, comprobanteHashSha256: archivo.hashSha256, comprobanteMimeType: input.comprobante!.mimeType, comprobanteTamanoBytes: archivo.tamanoBytes } : {}),
            cobradoPorId: context.actorId,
          },
        });
        const tramite = await tx.tramite.update({ where: { id: tramiteId }, data: { estado: 'COBRO' } });
        await auditarUsuario(tx, context, { entidad: 'cobro', entidadId: cobro.id, accion: 'COBRAR', estadoAnterior: 'APROBADO', estadoNuevo: tramite.estado });
        return { cobro };
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });
  return router;
}
