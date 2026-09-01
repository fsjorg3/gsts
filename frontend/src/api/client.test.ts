import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Se dobla el módulo OIDC: construir un UserManager real exigiría las variables
// de Keycloak y una ventana con sesión.
vi.mock('@/auth/oidc', () => ({ obtenerAccessToken: () => Promise.resolve('token-de-prueba') }));

import { reiniciarSesionParaPruebas, useSesionExpirada } from '@/auth/sesion';
import { api } from './client';
import { esApiError } from './errors';

function respuestaDeError(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: { code, message: 'mensaje del backend' } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Estado real de la señal, leído por el mismo hook que usa el diálogo. */
function sesionExpirada(): boolean {
  return renderHook(() => useSesionExpirada()).result.current;
}

afterEach(() => reiniciarSesionParaPruebas());

describe('cliente HTTP', () => {
  it('un 401 marca la sesión como expirada y sigue lanzando el ApiError', async () => {
    // openapi-fetch captura globalThis.fetch al crear el cliente, así que un
    // stub global no le llega: se le pasa el doble por petición, que sí pasa
    // por el mismo middleware.
    const error = await api
      .GET('/auth/me', { fetch: () => Promise.resolve(respuestaDeError(401, 'INVALID_TOKEN')) })
      .catch((e: unknown) => e);
    expect(esApiError(error) && error.status).toBe(401);
    expect(sesionExpirada()).toBe(true);
  });

  it('un 403 NO la marca: una cuenta sin rol no es una sesión vencida', async () => {
    const error = await api
      .GET('/auth/me', { fetch: () => Promise.resolve(respuestaDeError(403, 'MISSING_ROLE')) })
      .catch((e: unknown) => e);
    expect(esApiError(error) && error.code).toBe('MISSING_ROLE');
    expect(sesionExpirada()).toBe(false);
  });

  it('una respuesta correcta tampoco la marca', async () => {
    await api.GET('/auth/me', {
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ data: { actorId: 'a', roles: [] } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        ),
    });
    expect(sesionExpirada()).toBe(false);
  });
});
