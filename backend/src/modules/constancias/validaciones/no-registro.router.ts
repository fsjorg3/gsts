import { Router } from 'express';
import { z } from 'zod';
import { momentoValidacionSchema, validacionNoRegistroRequestSchema } from '@gsts/contracts';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { mimeRealCoincide } from '../../../shared/mime-real.js';
import { routeParam } from '../../../api/shared/params.js';

const momentoQuerySchema = z.object({ momento: momentoValidacionSchema });

// Registro de la consulta al padrón de usuarios para un trámite de No Registro.
// Espejo de validaciones.router.ts: upsert por [tramiteId, momento], de modo que
// repetir el mismo momento corrige el resultado en vez de duplicar la fila.
//
// Lo que hace que esto importe no está aquí sino en la base:
// fn_tramite_transicion_valida exige SIN_REGISTRO en VALIDACION_INICIAL para
// aprobar y en REVALIDACION_COBRO para cobrar. Registrar CON_REGISTRO es
// legítimo —es el hallazgo de que el predio sí está en el padrón— y deja el
// trámite bloqueado a propósito.
export function createValidacionesNoRegistroRouter(storage: NfsStorage): Router {
  const router = Router({ mergeParams: true });
  router.post('/', requireRoles('ventanilla'), async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = validacionNoRegistroRequestSchema.parse(request.body);
      const context = requestContext(request);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const { evidenciaOuc, ...resto } = input;
      const contenido = Buffer.from(evidenciaOuc.base64, 'base64');
      if (!mimeRealCoincide(contenido, evidenciaOuc.mimeType)) {
        throw new AppError(422, 'FILE_INVALID', 'El tipo de archivo de la evidencia no coincide con su contenido');
      }
      const tramite = await prisma.tramite.findUniqueOrThrow({ where: { id: tramiteId }, select: { createdAt: true } });
      archivo = await storage.save('evidencias', { tramiteId, creadoEn: tramite.createdAt }, contenido);
      const archivoGuardado = archivo;
      const evidenciaCampos = {
        evidenciaOucArchivoUuid: archivoGuardado.archivoUuid,
        evidenciaOucNombreOriginal: evidenciaOuc.nombreOriginal,
        evidenciaOucHashSha256: archivoGuardado.hashSha256,
        evidenciaOucMimeType: evidenciaOuc.mimeType,
        evidenciaOucTamanoBytes: archivoGuardado.tamanoBytes,
      };
      const data = await withBusinessTransaction(context, async (tx) => {
        const validacion = await tx.validacionNoRegistro.upsert({
          where: { tramiteId_momento: { tramiteId, momento: input.momento } },
          create: { ...resto, ...evidenciaCampos, tramiteId, validadoPorId: context.actorId },
          update: { ...resto, ...evidenciaCampos, validadoPorId: context.actorId, validadoAt: new Date() },
        });
        await auditarUsuario(tx, context, { entidad: 'validacion_no_registro', entidadId: validacion.id, accion: 'REGISTRAR', estadoNuevo: validacion.resultado });
        return validacion;
      });
      response.json({ data, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });
  router.get('/archivo', requireRoles('ventanilla', 'direccion'), async (request, response, next) => {
    try {
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const { momento } = momentoQuerySchema.parse(request.query);
      const validacion = await prisma.validacionNoRegistro.findUnique({
        where: { tramiteId_momento: { tramiteId, momento } },
        select: { evidenciaOucArchivoUuid: true, evidenciaOucMimeType: true, evidenciaOucNombreOriginal: true, tramite: { select: { createdAt: true } } },
      });
      if (!validacion) throw new AppError(404, 'NOT_FOUND', 'Validación no encontrada en el trámite');
      const contenido = await storage.leerPorUuid('evidencias', { tramiteId, creadoEn: validacion.tramite.createdAt }, validacion.evidenciaOucArchivoUuid);
      response.setHeader('content-type', validacion.evidenciaOucMimeType);
      response.setHeader('content-disposition', `attachment; filename="${validacion.evidenciaOucNombreOriginal}"`);
      response.send(contenido);
    } catch (error) { next(error); }
  });
  return router;
}
