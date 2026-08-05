import { Router } from 'express';
import { z } from 'zod';
import { withBusinessTransaction } from '../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../auditoria/service.js';
import { requestContext } from '../../shared/request-context.js';
import { routeParam } from '../../api/shared/params.js';

const schema = z.object({ metodo: z.enum(['MANUAL', 'API']), momento: z.enum(['VALIDACION_INICIAL', 'REVALIDACION_COBRO']), resultado: z.enum(['SIN_ADEUDO', 'CON_ADEUDO']), adeudoMonto: z.coerce.number().nonnegative().optional(), referenciaOuc: z.string().trim().min(1).max(255).optional() });

export function createValidacionesRouter(): Router {
  const router = Router({ mergeParams: true });
  router.post('/', async (request, response, next) => {
    try { const input = schema.parse(request.body); const context = requestContext(request); const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId'); const data = await withBusinessTransaction(context, async (tx) => { const validacion = await tx.validacionNoAdeudo.upsert({ where: { tramiteId_momento: { tramiteId, momento: input.momento } }, create: { ...input, tramiteId, validadoPorId: context.actorId }, update: { ...input, validadoPorId: context.actorId, validadoAt: new Date() } }); await auditarUsuario(tx, context, { entidad: 'validacion_no_adeudo', entidadId: validacion.id, accion: 'REGISTRAR', estadoNuevo: validacion.resultado }); return validacion; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  return router;
}
