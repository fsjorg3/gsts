import { Router, type RequestHandler } from 'express';
import { buscarPersonasSchema, crearPersonaSchema } from '@gsts/contracts';
import { prisma, withBusinessTransaction } from '../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../auditoria/service.js';
import { requireRoles } from '../auth/middleware.js';
import { requestContext } from '../../shared/request-context.js';

// Personas (titulares, representantes, apoderados, receptores fiscales).
// Prerequisito de POST /tramites: cada entrada de `personas[]` referencia una
// persona ya existente, por lo que ventanilla necesita crearlas y buscarlas.
export function createPersonasRouter(internal: RequestHandler[]): Router {
  const router = Router();
  router.use(...internal);

  router.get('/', async (request, response, next) => {
    try {
      const { take, cursor, search } = buscarPersonasSchema.parse(request.query);
      const data = await prisma.persona.findMany({
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        ...(search
          ? {
              where: {
                OR: [
                  { nombreRazonSocial: { contains: search, mode: 'insensitive' } },
                  { rfc: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
        orderBy: { createdAt: 'desc' },
      });
      const nextCursor = data.length > take ? data.pop()?.id : undefined;
      response.json({ data, meta: { nextCursor }, requestId: request.id });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requireRoles('ventanilla'), async (request, response, next) => {
    try {
      const input = crearPersonaSchema.parse(request.body);
      const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const persona = await tx.persona.create({ data: input });
        await auditarUsuario(tx, context, { entidad: 'persona', entidadId: persona.id, accion: 'CREAR' });
        return persona;
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
