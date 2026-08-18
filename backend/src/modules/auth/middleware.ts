import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import { resolveGstsClaims, type GstsClaims } from './claims.js';

declare global {
  namespace Express {
    interface Request { auth?: GstsClaims; actorId?: string; }
  }
}

export function createAuthenticate(env: Env) {
  const jwks = createRemoteJWKSet(new URL(env.KEYCLOAK_JWKS_URL));
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const authorization = request.header('authorization');
      if (!authorization?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Se requiere un token Bearer');
      const { payload } = await jwtVerify(authorization.slice(7), jwks, {
        issuer: env.KEYCLOAK_ISSUER_URL,
        audience: env.KEYCLOAK_AUDIENCE,
      });
      request.auth = resolveGstsClaims(payload, env.KEYCLOAK_CLIENT_ID);
      next();
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(401, 'INVALID_TOKEN', 'El token no es válido'));
    }
  };
}

export function requireRoles(...allowed: GstsClaims['roles']) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth || !request.auth.roles.some((role) => allowed.includes(role))) {
      next(new AppError(403, 'FORBIDDEN', 'No cuenta con permisos para esta operación'));
      return;
    }
    next();
  };
}
