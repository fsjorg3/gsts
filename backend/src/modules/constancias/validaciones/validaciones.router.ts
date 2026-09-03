import { Router } from 'express';
import { z } from 'zod';
import { momentoValidacionSchema, validacionRequestSchema } from '@gsts/contracts';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { mimeRealCoincide } from '../../../shared/mime-real.js';
import { routeParam } from '../../../api/shared/params.js';

const momentoQuerySchema = z.object({ momento: momentoValidacionSchema });

// Cruce con el OUC para un trámite de No Adeudo. El equivalente de No Registro
// —la consulta al padrón— vive en no-registro.router.ts.
export function createValidacionesRouter(storage: NfsStorage): Router {
  const router = Router({ mergeParams: true });
  router.post('/', requireRoles('ventanilla'), async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = validacionRequestSchema.parse(request.body);
      const context = requestContext(request);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const { evidenciaOuc, ...resto } = input;
      const contenido = Buffer.from(evidenciaOuc.base64, 'base64');
      if (!mimeRealCoincide(contenido, evidenciaOuc.mimeType)) {
        throw new AppError(422, 'FILE_INVALID', 'El tipo de archivo de la evidencia no coincide con su contenido');
      }
      archivo = await storage.save('evidencias', contenido);
      const archivoGuardado = archivo;
      const evidenciaCampos = {
        evidenciaOucArchivoUuid: archivoGuardado.archivoUuid,
        evidenciaOucNombreOriginal: evidenciaOuc.nombreOriginal,
        evidenciaOucHashSha256: archivoGuardado.hashSha256,
        evidenciaOucMimeType: evidenciaOuc.mimeType,
        evidenciaOucTamanoBytes: archivoGuardado.tamanoBytes,
      };
      const data = await withBusinessTransaction(context, async (tx) => {
        const validacion = await tx.validacionNoAdeudo.upsert({
          where: { tramiteId_momento: { tramiteId, momento: input.momento } },
          create: { ...resto, ...evidenciaCampos, tramiteId, validadoPorId: context.actorId },
          update: { ...resto, ...evidenciaCampos, validadoPorId: context.actorId, validadoAt: new Date() },
        });
        await auditarUsuario(tx, context, { entidad: 'validacion_no_adeudo', entidadId: validacion.id, accion: 'REGISTRAR', estadoNuevo: validacion.resultado });
        return validacion;
      });
      response.json({ data, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });
  router.get('/archivo', requireRoles('ventanilla', 'direccion'), async (request, response, next) => {
    try {
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const { momento } = momentoQuerySchema.parse(request.query);
      const validacion = await prisma.validacionNoAdeudo.findUnique({
        where: { tramiteId_momento: { tramiteId, momento } },
        select: { evidenciaOucArchivoUuid: true, evidenciaOucMimeType: true, evidenciaOucNombreOriginal: true },
      });
      if (!validacion) throw new AppError(404, 'NOT_FOUND', 'Validación no encontrada en el trámite');
      const contenido = await storage.leerPorUuid('evidencias', validacion.evidenciaOucArchivoUuid);
      response.setHeader('content-type', validacion.evidenciaOucMimeType);
      response.setHeader('content-disposition', `attachment; filename="${validacion.evidenciaOucNombreOriginal}"`);
      response.send(contenido);
    } catch (error) { next(error); }
  });
  return router;
}
