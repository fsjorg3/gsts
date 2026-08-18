import { Router } from 'express';
import { validacionRequestSchema } from '@gsts/contracts';
import { withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requestContext } from '../../../shared/request-context.js';
import { routeParam } from '../../../api/shared/params.js';

// Cruce con el OUC para un trámite de No Adeudo. El equivalente de No Registro
// —la consulta al padrón— vive en no-registro.router.ts.
export function createValidacionesRouter(): Router {
  const router = Router({ mergeParams: true });
  router.post('/', async (request, response, next) => {
    try { const input = validacionRequestSchema.parse(request.body); const context = requestContext(request); const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId'); const data = await withBusinessTransaction(context, async (tx) => { const validacion = await tx.validacionNoAdeudo.upsert({ where: { tramiteId_momento: { tramiteId, momento: input.momento } }, create: { ...input, tramiteId, validadoPorId: context.actorId }, update: { ...input, validadoPorId: context.actorId, validadoAt: new Date() } }); await auditarUsuario(tx, context, { entidad: 'validacion_no_adeudo', entidadId: validacion.id, accion: 'REGISTRAR', estadoNuevo: validacion.resultado }); return validacion; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  return router;
}
