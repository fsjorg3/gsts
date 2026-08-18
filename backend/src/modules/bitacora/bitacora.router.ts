import { Router, type RequestHandler } from 'express';
import { listarBitacoraSchema } from '@gsts/contracts';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import { requireRoles } from '../auth/middleware.js';

// Visor de auditoría global (rol ti). Sólo lectura: la bitácora se escribe
// exclusivamente vía auditarUsuario en la misma transacción de negocio que
// origina cada acción. ip_address/user_agent se excluyen del `select` a
// propósito — nunca deben salir de esta consulta hacia la respuesta.
const SELECT_BITACORA = {
  id: true,
  timestamp: true,
  actorId: true,
  origen: true,
  entidad: true,
  entidadId: true,
  accion: true,
  estadoAnterior: true,
  estadoNuevo: true,
  datosAntes: true,
  datosDespues: true,
  detalle: true,
  requestId: true,
  correccionDeId: true,
} satisfies Prisma.BitacoraSelect;

export function createBitacoraRouter(internal: RequestHandler[]): Router {
  const router = Router();
  router.use(...internal, requireRoles('ti'));

  router.get('/', async (request, response, next) => {
    try {
      const { take, cursor, entidad, entidadId, accion, actorId, desde, hasta } = listarBitacoraSchema.parse(request.query);
      const where: Prisma.BitacoraWhereInput = {
        ...(entidad ? { entidad } : {}),
        ...(entidadId ? { entidadId } : {}),
        ...(accion ? { accion } : {}),
        ...(actorId ? { actorId } : {}),
        ...(desde || hasta ? { timestamp: { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) } } : {}),
      };
      const data = await prisma.bitacora.findMany({
        select: SELECT_BITACORA,
        where,
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { timestamp: 'desc' },
      });
      const nextCursor = data.length > take ? data.pop()?.id : undefined;
      response.json({ data, meta: { nextCursor }, requestId: request.id });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
