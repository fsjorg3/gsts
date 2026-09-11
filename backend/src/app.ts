import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import type { Env } from './config/env.js';
import { createApiRouter } from './api/router.js';
import { errorHandler, notFound } from './shared/errors.js';

export function createApp(env: Env) {
  const logger = pino({
    level: env.LOG_LEVEL,
    redact: ['req.headers.authorization', 'req.headers.cookie', '*.rfc', '*.sub', '*.correo', '*.nombre', '*.token', '*.password'],
  });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(pinoHttp({ logger, genReqId: (request) => String(request.headers['x-request-id'] ?? randomUUID()) }));
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  // Las evidencias se reciben codificadas en Base64: el límite HTTP contempla
  // su sobrecarga, mientras que PostgreSQL conserva el límite real acumulado.
  app.use(express.json({ limit: '42mb' }));
  app.use(`${env.API_PREFIX}/public`, rateLimit({ windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS, limit: env.PUBLIC_RATE_LIMIT_MAX, standardHeaders: 'draft-8', legacyHeaders: false }));
  // Mismo backstop de prefijo que /public, para /portal: el límite por folio
  // de portal.router.ts protege un folio puntual, pero no acota el volumen
  // total que el backend del portal —un único caller identificable— manda.
  app.use(`${env.API_PREFIX}/portal`, rateLimit({ windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS, limit: env.PUBLIC_RATE_LIMIT_MAX, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(env.API_PREFIX, createApiRouter(env));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
