import createClient, { type Middleware } from 'openapi-fetch';
import { obtenerAccessToken } from '@/auth/oidc';
import { marcarSesionExpirada } from '@/auth/sesion';
import { ApiError, type ApiErrorBody } from './errors';
import type { paths } from './schema';

// Cliente HTTP tipado desde el contrato OpenAPI (schema.d.ts, generado con
// `npm run gen:api`). Convenciones de alambre del contrato:
// - éxito: { data, requestId? } / listas: { data, meta?, requestId? }
// - error: { error: { code, message, details? } } → se lanza ApiError
// - idempotencia: header idempotency-key en cobros/aplicar borrador (lo pone
//   cada mutación que lo necesita, no el middleware).

const auth: Middleware = {
  async onRequest({ request }) {
    const token = await obtenerAccessToken();
    if (token) request.headers.set('authorization', `Bearer ${token}`);
    return request;
  },
  async onResponse({ response }) {
    if (response.ok) return response;
    // Un 401 es la otra cara de sesion.ts: cubre lo que el evento
    // `AccessTokenExpired` no ve —rotación de llaves en Keycloak, logout SSO
    // desde otro cliente, desfase de reloj—. Sólo 401: un 403 MISSING_ROLE es
    // una cuenta sin rol, no una sesión vencida, y reautenticarla haría un
    // bucle. El error se sigue lanzando igual para quien llamó.
    if (response.status === 401) marcarSesionExpirada();
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.clone().json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(response.status, body);
  },
};

export const api = createClient<paths>({ baseUrl: import.meta.env.VITE_API_BASE_URL });
api.use(auth);

/** Genera la clave de idempotencia para cobros (una por intento de mutación). */
export function nuevaIdempotencyKey(): string {
  return crypto.randomUUID();
}
