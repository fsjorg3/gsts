import { queryOptions } from '@tanstack/react-query';
import { ApiError, type ApiErrorBody } from '@/api/errors';

// Cliente dedicado, no el `api` de openapi-fetch: esta pantalla la abre un
// ciudadano sin sesión (desde el QR impreso o tecleando el enlace), así que no
// debe cargar el bearer token ni el middleware que marca la sesión expirada
// ante un 401 — estas rutas nunca responden 401. Mismo backend y mismo sobre
// de error que el resto de GSTS, por eso sí reutiliza `ApiError` (igual que
// el cliente de GAF en features/gaf/client.ts, con el mismo razonamiento).
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/public/constancias`;

export type EstadoVerificacion = 'VIGENTE' | 'VENCIDA' | 'ANULADA';

export interface DomicilioPredioPublico {
  calle: string | null;
  numero: string | null;
  colonia: string | null;
  perteneceA: 'JUNTA_AUXILIAR' | 'MUNICIPIO' | null;
  perteneceANombre: string | null;
}

export interface VerificacionConstancia {
  valido: true;
  folio: string;
  tipo: 'NO_ADEUDO' | 'NO_REGISTRO';
  estado: EstadoVerificacion;
  vigenciaHasta: string;
  titular: { nombreRazonSocial: string };
  /** Sólo en NO_REGISTRO: en NO_ADEUDO la referencia del predio es el NIS, que no se expone. */
  domicilio?: DomicilioPredioPublico;
}

async function leerRespuesta(response: Response): Promise<VerificacionConstancia> {
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(response.status, body);
  }
  const payload = (await response.json()) as { data: VerificacionConstancia };
  return payload.data;
}

/** Verificación por QR: folio y token llegan tal cual del enlace escaneado. */
export async function verificarPorQr(folio: string, token: string): Promise<VerificacionConstancia> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(folio)}/verificar/${encodeURIComponent(token)}`);
  return leerRespuesta(response);
}

/**
 * Verificación manual, sin QR: `codigo` acepta el token completo (pegado tal
 * cual, p. ej. decodificado con otra app) o el código corto impreso en texto
 * bajo el QR.
 */
export async function verificarManual(folio: string, codigo: string): Promise<VerificacionConstancia> {
  const response = await fetch(`${BASE_URL}/verificar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ folio, codigo }),
  });
  return leerRespuesta(response);
}

/** No reintenta: un 404 (folio/credencial inválidos) o un 429 no se arreglan solos. */
export function verificacionPorQrOptions(folio: string, token: string) {
  return queryOptions({
    queryKey: ['verificacion-publica', 'qr', folio, token],
    queryFn: () => verificarPorQr(folio, token),
    retry: false,
  });
}
