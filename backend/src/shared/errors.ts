import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { traducirErrorPrisma } from './prisma-errors.js';

export class AppError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' },
    requestId: request.id,
  });
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  // Orden deliberado: un AppError explícito del router gana siempre sobre la
  // traducción genérica de Prisma, que es la red para lo que nadie anticipó.
  const normalized = error instanceof ZodError
    ? new AppError(422, 'VALIDATION_ERROR', 'La entrada no es válida', error.flatten())
    : error instanceof AppError
      ? error
      : traducirErrorPrisma(error)
        ?? new AppError(500, 'INTERNAL_ERROR', 'Ocurrió un error interno');

  if (normalized.status >= 500) {
    request.log.error({ err: error, requestId: request.id }, 'request_failed');
  } else if (!(error instanceof AppError) && !(error instanceof ZodError)) {
    // Traducido de Prisma: al bajar de 500 a 4xx se perdería el rastro, y el
    // mensaje original trae la consulta y la restricción exactas.
    request.log.warn({ err: error, requestId: request.id, code: normalized.code }, 'request_rejected_by_database');
  }
  response.status(normalized.status).json({
    error: { code: normalized.code, message: normalized.message, details: normalized.details },
    requestId: request.id,
  });
};
