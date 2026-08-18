import { Router } from 'express';
import { validacionNoRegistroRequestSchema } from '@gsts/contracts';
import { withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requestContext } from '../../../shared/request-context.js';
import { routeParam } from '../../../api/shared/params.js';

// Registro de la consulta al padrón de usuarios para un trámite de No Registro.
// Espejo de validaciones.router.ts: upsert por [tramiteId, momento], de modo que
// repetir el mismo momento corrige el resultado en vez de duplicar la fila.
//
// Lo que hace que esto importe no está aquí sino en la base:
// fn_tramite_transicion_valida exige SIN_REGISTRO en VALIDACION_INICIAL para
// aprobar y en REVALIDACION_COBRO para cobrar. Registrar CON_REGISTRO es
// legítimo —es el hallazgo de que el predio sí está en el padrón— y deja el
// trámite bloqueado a propósito.
export function createValidacionesNoRegistroRouter(): Router {
  const router = Router({ mergeParams: true });
  router.post('/', async (request, response, next) => {
    try {
      const input = validacionNoRegistroRequestSchema.parse(request.body);
      const context = requestContext(request);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const data = await withBusinessTransaction(context, async (tx) => {
        const validacion = await tx.validacionNoRegistro.upsert({
          where: { tramiteId_momento: { tramiteId, momento: input.momento } },
          create: { ...input, tramiteId, validadoPorId: context.actorId },
          update: { ...input, validadoPorId: context.actorId, validadoAt: new Date() },
        });
        await auditarUsuario(tx, context, { entidad: 'validacion_no_registro', entidadId: validacion.id, accion: 'REGISTRAR', estadoNuevo: validacion.resultado });
        return validacion;
      });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  return router;
}
