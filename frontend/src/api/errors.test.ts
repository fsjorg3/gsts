import { describe, expect, it } from 'vitest';
import { ApiError, copyDeError, esApiError } from './errors';

describe('ApiError', () => {
  it('traduce códigos del catálogo §7 a copy en español', () => {
    const error = new ApiError(409, { error: { code: 'DRAFT_ALREADY_OPEN', message: 'raw' } });
    expect(error.code).toBe('DRAFT_ALREADY_OPEN');
    expect(error.copy).toContain('borrador de cobro abierto');
  });

  it('cae al message del backend para códigos no catalogados', () => {
    const error = new ApiError(418, { error: { code: 'CODIGO_NUEVO', message: 'Mensaje del servidor' } });
    expect(error.copy).toBe('Mensaje del servidor');
  });

  it('sin body (respuesta no-JSON) degrada a INTERNAL_ERROR', () => {
    const error = new ApiError(502, undefined);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.copy).toContain('error inesperado');
  });

  it('conserva status, details y requestId', () => {
    const error = new ApiError(422, { error: { code: 'VALIDATION_ERROR', message: 'x', details: { campo: 'rfc' } }, requestId: 'req-1' });
    expect(error.status).toBe(422);
    expect(error.details).toEqual({ campo: 'rfc' });
    expect(error.requestId).toBe('req-1');
  });
});

describe('copyDeError', () => {
  it('detecta ApiError y usa su copy', () => {
    const error = new ApiError(409, { error: { code: 'INVALID_STATE', message: 'raw' } });
    expect(esApiError(error)).toBe(true);
    expect(copyDeError(error)).toContain('estado actual');
  });
  it('para errores de red regresa copy genérico de conexión', () => {
    expect(copyDeError(new TypeError('fetch failed'))).toContain('conexión');
  });
});
