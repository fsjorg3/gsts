import { obtenerAccessToken } from '@/auth/oidc';
import { ApiError, type ApiErrorBody } from '@/api/errors';

// Cliente de GAF (sistema de Finanzas, repo y despliegue aparte). No usa
// openapi-fetch (tipado contra el OpenAPI de GSTS) ni @gsts/contracts: son dos
// backends distintos y acoplar sus tipos haría que un cambio en GAF rompiera la
// compilación de GSTS. Reusa el mismo token de sesión — la arquitectura ya
// decidida es que el navegador de ventanilla manda los datos fiscales directo a
// GAF, con el mismo access token de Keycloak/SOAPAP (ver documentacion2 de GAF)
// — y el mismo sobre de error `{ error: { code, message, details? }, requestId }`,
// así que reutiliza la clase `ApiError` ya existente.
const BASE_URL = import.meta.env.VITE_GAF_BASE_URL;

async function peticion<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await obtenerAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  // Content-Type nunca se fija a mano cuando el body es FormData: el navegador
  // debe poner el boundary del multipart él mismo.
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(response.status, body);
  }
  const payload = (await response.json()) as { data: T; requestId?: string };
  return payload.data;
}

export const gaf = {
  get: <T>(path: string): Promise<T> => peticion<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: FormData): Promise<T> => peticion<T>(path, { method: 'POST', body }),
};
