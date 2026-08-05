import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

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
  const normalized = error instanceof ZodError
    ? new AppError(422, 'VALIDATION_ERROR', 'La entrada no es válida', error.flatten())
    : error instanceof AppError
      ? error
      : new AppError(500, 'INTERNAL_ERROR', 'Ocurrió un error interno');

  if (normalized.status >= 500) request.log.error({ err: error, requestId: request.id }, 'request_failed');
  response.status(normalized.status).json({
    error: { code: normalized.code, message: normalized.message, details: normalized.details },
    requestId: request.id,
  });
};
