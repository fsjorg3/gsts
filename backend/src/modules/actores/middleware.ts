import type { NextFunction, Request, Response } from 'express';
import { resolveActor } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';

export async function bindActor(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Se requiere autenticación');
    request.actorId = await resolveActor(request.auth.sub);
    next();
  } catch (error) {
    next(error);
  }
}
