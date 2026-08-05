import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../config/env.js';

// Token de verificación de constancias: HMAC-SHA256 del folio, truncado y con
// la versión de clave al frente ("v1.a1b2c3d4e5f60718a9bc").
//
// No es una firma electrónica ni pretende valor probatorio: sólo evita que los
// folios —que son secuenciales y por tanto enumerables— puedan consultarse sin
// tener el documento en la mano. La validez jurídica de la constancia recae en
// la firma autógrafa del papel.
//
// El prefijo de versión permite rotar la clave sin invalidar lo ya emitido: un
// token nacido con v1 se sigue verificando con la clave v1 aunque la versión
// actual sea v2.

/** Longitud en caracteres hex del HMAC truncado (20 hex = 10 bytes = 80 bits). */
const LONGITUD_HMAC = 20;

const FORMATO_TOKEN = /^(v\d+)\.([0-9a-f]+)$/;

export interface VerificadorTokens {
  /**
   * Genera el token del folio. `version` reproduce el token de una constancia
   * ya emitida: sin ella, tras rotar la clave la URL mostrada en pantalla no
   * coincidiría con el QR impreso en el papel (ambas verificarían, pero serían
   * cadenas distintas). Para eso se persiste constancia.version_token.
   */
  generarToken(folio: string, version?: string): string;
  /** Compara en tiempo constante. Devuelve false —nunca lanza— ante cualquier anomalía. */
  verificarToken(folio: string, tokenRecibido: string): boolean;
  /**
   * URL completa que codifica el QR impreso en la constancia, o `null` si la
   * versión pedida ya no tiene clave configurada. Devuelve null en vez de
   * lanzar porque se usa al leer constancias antiguas: retirar una clave no
   * debe tumbar el detalle de un trámite ya cerrado.
   */
  urlVerificacion(folio: string, version?: string): string | null;
  /** Versión de clave con la que se está firmando ahora mismo. */
  versionActual: string;
}

/**
 * Construye el verificador a partir de la configuración ya validada por env.ts,
 * que es donde se impone el mínimo de 32 bytes por clave. Recibir `env` en vez
 * de leer `process.env` mantiene el módulo probable sin tocar el entorno global.
 */
export function crearVerificadorTokens(env: Env): VerificadorTokens {
  const secretos: Record<string, string> = { v1: env.SECRETO_VERIFICADOR_V1 };
  if (env.SECRETO_VERIFICADOR_V2) secretos.v2 = env.SECRETO_VERIFICADOR_V2;

  const versionActual = env.VERSION_TOKEN_ACTUAL;
  const secretoActual = secretos[versionActual];
  if (!secretoActual) {
    throw new Error(`VERSION_TOKEN_ACTUAL es "${versionActual}" pero no existe SECRETO_VERIFICADOR_${versionActual.toUpperCase()}`);
  }

  const calcular = (folio: string, secreto: string): string =>
    createHmac('sha256', secreto).update(folio, 'utf8').digest('hex').slice(0, LONGITUD_HMAC);

  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, '');

  const verificador: VerificadorTokens = {
    versionActual,

    generarToken(folio, version = versionActual) {
      const secreto = secretos[version];
      if (!secreto) throw new Error(`No hay clave de verificación para la versión "${version}"`);
      return `${version}.${calcular(folio, secreto)}`;
    },

    urlVerificacion(folio, version = versionActual) {
      if (!secretos[version]) return null;
      return `${base}/constancias/${encodeURIComponent(folio)}/verificar/${verificador.generarToken(folio, version)}`;
    },

    verificarToken(folio, tokenRecibido) {
      if (typeof tokenRecibido !== 'string') return false;
      const partes = FORMATO_TOKEN.exec(tokenRecibido);
      if (!partes) return false;

      const [, version, hmacRecibido] = partes as unknown as [string, string, string];
      const secreto = secretos[version];
      if (!secreto) return false;

      const esperado = Buffer.from(calcular(folio, secreto), 'hex');
      const recibido = Buffer.from(hmacRecibido, 'hex');
      // timingSafeEqual lanza si las longitudes difieren, así que la
      // comparación de longitud va antes y fuera del tiempo constante (la
      // longitud del token no es secreta).
      if (esperado.length !== recibido.length) return false;
      return timingSafeEqual(esperado, recibido);
    },
  };

  return verificador;
}
