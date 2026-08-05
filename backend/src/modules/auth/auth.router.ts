import { Router, type RequestHandler } from 'express';

export function createAuthRouter(internal: RequestHandler[]): Router {
  const router = Router();
  router.use(...internal);
  router.get('/me', (request, response) => {
    response.json({ data: { actorId: request.actorId, roles: request.auth?.roles }, requestId: request.id });
  });
  return router;
}
