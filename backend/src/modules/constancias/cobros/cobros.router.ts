import { Router } from 'express';
import { z } from 'zod';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';
import { mimeRealCoincide } from '../../../shared/mime-real.js';
import { resolverMotivoReduccion } from './motivo-reduccion.js';

const comprobanteSchema = z.object({ base64: z.string().min(1), nombreOriginal: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(100) });
const schema = z.object({ tarifaId: z.string().uuid(), motivoReduccionId: z.string().uuid().nullable().optional(), formaPago: z.string().trim().min(1).max(10), metodoPago: z.enum(['PUE', 'PPD']), moneda: z.literal('MXN').default('MXN'), facturaSolicitadaEnVentanilla: z.boolean().default(false), referenciaPago: z.string().trim().min(1).max(255), comprobante: comprobanteSchema });

export function createCobrosRouter(storage: NfsStorage): Router {
  const router = Router({ mergeParams: true });
  router.post('/', async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = schema.parse(request.body);
      const context = requestContext(request);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const contenidoComprobante = Buffer.from(input.comprobante.base64, 'base64');
      if (!mimeRealCoincide(contenidoComprobante, input.comprobante.mimeType)) {
        throw new AppError(422, 'FILE_INVALID', 'El tipo de archivo del comprobante no coincide con su contenido');
      }
      archivo = await storage.save('comprobantes', contenidoComprobante);
      const archivoGuardado = archivo;
      const data = await withBusinessTransaction(context, async (tx) => {
        const tarifa = await tx.tarifa.findUniqueOrThrow({ where: { id: input.tarifaId } });
        const { motivoReduccionId, porcentajeReduccion } = await resolverMotivoReduccion(tx, input.motivoReduccionId);
        const montoBase = Number(tarifa.monto);
        const montoFinal = Number((montoBase * (1 - porcentajeReduccion / 100)).toFixed(2));
        const cobro = await tx.cobro.create({
          data: {
            tramiteId, tarifaId: tarifa.id, montoBase, motivoReduccionId, porcentajeReduccion, montoFinal,
            formaPago: input.formaPago, metodoPago: input.metodoPago, moneda: input.moneda, facturaSolicitadaEnVentanilla: input.facturaSolicitadaEnVentanilla, referenciaPago: input.referenciaPago,
            comprobanteArchivoUuid: archivoGuardado.archivoUuid, comprobanteNombreOriginal: input.comprobante.nombreOriginal, comprobanteHashSha256: archivoGuardado.hashSha256, comprobanteMimeType: input.comprobante.mimeType, comprobanteTamanoBytes: archivoGuardado.tamanoBytes,
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
  // Descarga el ticket/comprobante ya adjuntado al cobrar. Lectura pura (sin
  // withBusinessTransaction ni bitácora), acotada al tramiteId de la ruta,
  // mismo patrón que la descarga de evidencias y de comprobante de Finanzas.
  router.get('/comprobante', async (request, response, next) => {
    try {
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const cobro = await prisma.cobro.findFirst({
        where: { tramiteId },
        select: { comprobanteArchivoUuid: true, comprobanteMimeType: true, comprobanteNombreOriginal: true },
      });
      if (!cobro?.comprobanteArchivoUuid || !cobro.comprobanteMimeType) {
        throw new AppError(404, 'NOT_FOUND', 'El cobro de este trámite no tiene comprobante adjunto');
      }
      const contenido = await storage.leerPorUuid('comprobantes', cobro.comprobanteArchivoUuid);
      response.setHeader('content-type', cobro.comprobanteMimeType);
      response.setHeader('content-disposition', `attachment; filename="${cobro.comprobanteNombreOriginal ?? 'comprobante'}"`);
      response.send(contenido);
    } catch (error) { next(error); }
  });
  return router;
}
