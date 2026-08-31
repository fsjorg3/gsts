import { Router } from 'express';
import { z } from 'zod';
import { actualizarEvidenciaSchema } from '@gsts/contracts';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';

const evidenciaSchema = z.object({ opcionDocumentoId: z.string().uuid(), nombreOriginal: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(100), contenidoBase64: z.string().min(1).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'El archivo debe estar codificado en Base64') });

export function createEvidenciasRouter(storage: NfsStorage, maxBytes: number): Router {
  const router = Router({ mergeParams: true });
  router.post('/', requireRoles('ventanilla'), async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = evidenciaSchema.parse(request.body); const contenido = Buffer.from(input.contenidoBase64, 'base64');
      if (contenido.byteLength > maxBytes) throw new AppError(422, 'FILE_TOO_LARGE', 'La evidencia excede el limite permitido');
      const archivoGuardado = await storage.save('evidencias', contenido); archivo = archivoGuardado; const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => { const evidencia = await tx.evidencia.create({ data: { tramiteId: routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId'), opcionDocumentoId: input.opcionDocumentoId, archivoUuid: archivoGuardado.archivoUuid, nombreOriginal: input.nombreOriginal, hashSha256: archivoGuardado.hashSha256, mimeType: input.mimeType, tamanoBytes: archivoGuardado.tamanoBytes, creadoPorId: context.actorId } }); await auditarUsuario(tx, context, { entidad: 'evidencia', entidadId: evidencia.id, accion: 'CARGAR', detalle: { mimeType: evidencia.mimeType, tamanoBytes: evidencia.tamanoBytes } }); return evidencia; });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });
  router.patch('/:id', requireRoles('ventanilla'), async (request, response, next) => {
    try {
      const input = actualizarEvidenciaSchema.parse(request.body);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const evidenciaId = routeParam((request.params as { id?: string }).id, 'id');
      const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const previa = await tx.evidencia.findFirst({ where: { id: evidenciaId, tramiteId }, select: { estado: true } });
        if (!previa) throw new AppError(404, 'NOT_FOUND', 'Evidencia no encontrada en el trámite');
        const evidencia = await tx.evidencia.update({ where: { id: evidenciaId }, data: { estado: input.estado } });
        await auditarUsuario(tx, context, { entidad: 'evidencia', entidadId: evidencia.id, accion: 'RESOLVER', estadoAnterior: previa.estado, estadoNuevo: evidencia.estado });
        return evidencia;
      });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.get('/:id/archivo', requireRoles('ventanilla', 'direccion'), async (request, response, next) => {
    try {
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const evidenciaId = routeParam((request.params as { id?: string }).id, 'id');
      const evidencia = await prisma.evidencia.findFirst({
        where: { id: evidenciaId, tramiteId },
        select: { archivoUuid: true, mimeType: true, nombreOriginal: true },
      });
      if (!evidencia) throw new AppError(404, 'NOT_FOUND', 'Evidencia no encontrada en el trámite');
      const contenido = await storage.leerPorUuid('evidencias', evidencia.archivoUuid);
      response.setHeader('content-type', evidencia.mimeType);
      response.setHeader('content-disposition', `attachment; filename="${evidencia.nombreOriginal}"`);
      response.send(contenido);
    } catch (error) { next(error); }
  });
  return router;
}
