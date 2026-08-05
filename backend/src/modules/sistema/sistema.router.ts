import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma.js';
import { openApiDocument } from '../../api/openapi.js';

export function createSistemaRouter(): Router {
  const router = Router();
  router.get('/health', (_request, response) => response.json({ data: { status: 'ok' } }));
  router.get('/ready', async (_request, response, next) => {
    try { await prisma.$queryRaw`SELECT 1`; response.json({ data: { status: 'ready' } }); } catch (error) { next(error); }
  });
  router.get('/openapi.json', (_request, response) => response.json(openApiDocument));
  return router;
}
