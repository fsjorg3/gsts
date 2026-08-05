import type { Request } from 'express';
import type { DatabaseContext } from '../infrastructure/database/prisma.js';
import { AppError } from './errors.js';

export function requestContext(request: Request): DatabaseContext & { ipAddress: string; userAgent: string } {
  if (!request.auth || !request.actorId) throw new AppError(401, 'UNAUTHENTICATED', 'Se requiere autenticación');
  return {
    actorId: request.actorId,
    roles: request.auth.roles,
    requestId: String(request.id ?? ''),
    ipAddress: request.ip ?? '0.0.0.0',
    userAgent: request.header('user-agent') ?? 'unknown',
  };
}
