import { describe, expect, it } from 'vitest';
import { crearVerificadorTokens } from '../../src/infrastructure/verificacion/token.js';
import type { Env } from '../../src/config/env.js';

const CLAVE_V1 = 'clave-v1-de-al-menos-32-bytes-para-hmac';
const CLAVE_V2 = 'clave-v2-distinta-de-al-menos-32-bytes';

// Sólo los campos que el verificador lee; el resto de Env no interviene.
function env(overrides: Partial<Env> = {}): Env {
  return {
    PUBLIC_BASE_URL: 'https://portal.test',
    SECRETO_VERIFICADOR_V1: CLAVE_V1,
    VERSION_TOKEN_ACTUAL: 'v1',
    ...overrides,
  } as Env;
}

const FOLIO = 'SICEF-42-A1B2C3D4';

describe('crearVerificadorTokens', () => {
  it('genera un token con la versión al frente y lo verifica', () => {
    const { generarToken, verificarToken } = crearVerificadorTokens(env());
    const token = generarToken(FOLIO);
    expect(token).toMatch(/^v1\.[0-9a-f]{20}$/);
    expect(verificarToken(FOLIO, token)).toBe(true);
  });

  it('rechaza un HMAC alterado en un solo carácter', () => {
    const { generarToken, verificarToken } = crearVerificadorTokens(env());
    const token = generarToken(FOLIO);
    const ultimo = token.slice(-1);
    const alterado = `${token.slice(0, -1)}${ultimo === 'a' ? 'b' : 'a'}`;
    expect(alterado).not.toBe(token);
    expect(verificarToken(FOLIO, alterado)).toBe(false);
  });

  it('rechaza el token de otro folio', () => {
    const { generarToken, verificarToken } = crearVerificadorTokens(env());
    expect(verificarToken('SICEF-99-FFFFFFFF', generarToken(FOLIO))).toBe(false);
  });

  it('rechaza una versión inexistente sin lanzar', () => {
    const { generarToken, verificarToken } = crearVerificadorTokens(env());
    const hmac = generarToken(FOLIO).split('.')[1];
    expect(() => verificarToken(FOLIO, `v9.${hmac}`)).not.toThrow();
    expect(verificarToken(FOLIO, `v9.${hmac}`)).toBe(false);
  });

  it('rechaza tokens malformados sin lanzar', () => {
    const { verificarToken } = crearVerificadorTokens(env());
    const malformados = [
      '',
      'sinpunto',
      'v1.',
      '.a1b2c3d4e5f60718a9bc',
      'v1.NO-ES-HEX-NO-ES-HEX-XX',
      'v1.a1b2c3', // hex válido pero longitud incorrecta
      'v1.a1b2c3d4e5f60718a9bcd', // un carácter de más
      'a1b2c3d4e5f60718a9bc',
      'v1.a1b2c3d4e5f60718a9bc.extra',
    ];
    for (const token of malformados) {
      expect(() => verificarToken(FOLIO, token), token).not.toThrow();
      expect(verificarToken(FOLIO, token), token).toBe(false);
    }
  });

  it('arma la URL de verificación desde PUBLIC_BASE_URL', () => {
    const { urlVerificacion, generarToken } = crearVerificadorTokens(env());
    expect(urlVerificacion(FOLIO)).toBe(`https://portal.test/constancias/${FOLIO}/verificar/${generarToken(FOLIO)}`);
  });

  it('devuelve null —sin lanzar— si la versión pedida ya no tiene clave', () => {
    // Caso real: se retira la clave v1 y luego se abre el detalle de un trámite
    // cuya constancia nació con v1. No debe tumbar la respuesta completa.
    const { urlVerificacion } = crearVerificadorTokens(env({ SECRETO_VERIFICADOR_V2: CLAVE_V2, VERSION_TOKEN_ACTUAL: 'v2' }));
    expect(urlVerificacion(FOLIO, 'v9')).toBeNull();
  });
});

describe('rotación de claves', () => {
  const conDosVersiones = env({ SECRETO_VERIFICADOR_V2: CLAVE_V2, VERSION_TOKEN_ACTUAL: 'v2' });

  it('firma con la versión actual', () => {
    const { generarToken, versionActual } = crearVerificadorTokens(conDosVersiones);
    expect(versionActual).toBe('v2');
    expect(generarToken(FOLIO)).toMatch(/^v2\./);
  });

  it('sigue verificando un token v1 emitido antes de la rotación', () => {
    const antes = crearVerificadorTokens(env()).generarToken(FOLIO);
    const despues = crearVerificadorTokens(conDosVersiones);
    expect(antes).toMatch(/^v1\./);
    expect(despues.verificarToken(FOLIO, antes)).toBe(true);
    expect(despues.verificarToken(FOLIO, despues.generarToken(FOLIO))).toBe(true);
  });

  it('reproduce el token impreso al pedir una versión anterior explícita', () => {
    const original = crearVerificadorTokens(env()).generarToken(FOLIO);
    // Sin el parámetro de versión, la URL mostrada tras rotar no coincidiría
    // con el QR ya impreso en el papel; por eso se persiste version_token.
    expect(crearVerificadorTokens(conDosVersiones).generarToken(FOLIO, 'v1')).toBe(original);
  });

  it('falla al arrancar si VERSION_TOKEN_ACTUAL no tiene clave', () => {
    expect(() => crearVerificadorTokens(env({ VERSION_TOKEN_ACTUAL: 'v2' }))).toThrow(/SECRETO_VERIFICADOR_V2/);
  });
});
