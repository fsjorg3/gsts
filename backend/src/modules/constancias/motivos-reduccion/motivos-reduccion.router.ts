import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { actualizarMotivoReduccionSchema, crearMotivoReduccionSchema } from '@gsts/contracts';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { routeParam } from '../../../api/shared/params.js';

// Catálogo simple de motivos de reducción de tarifa (INAPAM, discapacidad,
// programa social, etc.). Sin versionado ni publicación como catálogos/tarifas:
// el porcentaje se congela en cobro/borrador_cobro al aplicarse, así que editar
// o desactivar un motivo aquí nunca corrompe cobros históricos.
export function createMotivosReduccionRouter(internal: RequestHandler[]): Router {
  const router = Router();
  router.use(...internal);

  // Cualquier actor autenticado lee (ventanilla necesita la lista de activos
  // para el selector de cobro); las mutaciones exigen ti.
  router.get('/', async (request, response, next) => {
    try {
      const { activo } = z.object({ activo: z.coerce.boolean().optional() }).parse(request.query);
      const data = await prisma.motivoReduccion.findMany({
        where: activo === undefined ? {} : { activo },
        orderBy: { nombre: 'asc' },
      });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  router.use(requireRoles('ti'));
  router.post('/', async (request, response, next) => {
    try {
      const input = crearMotivoReduccionSchema.parse(request.body);
      const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const motivo = await tx.motivoReduccion.create({ data: input });
        await auditarUsuario(tx, context, { entidad: 'motivo_reduccion', entidadId: motivo.id, accion: 'CREAR' });
        return motivo;
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  router.patch('/:id', async (request, response, next) => {
    try {
      const input = actualizarMotivoReduccionSchema.parse(request.body);
      const context = requestContext(request);
      const id = routeParam(request.params.id, 'id');
      const data = await withBusinessTransaction(context, async (tx) => {
        const motivo = await tx.motivoReduccion.update({ where: { id }, data: input });
        await auditarUsuario(tx, context, { entidad: 'motivo_reduccion', entidadId: motivo.id, accion: 'ACTUALIZAR' });
        return motivo;
      });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  return router;
}
