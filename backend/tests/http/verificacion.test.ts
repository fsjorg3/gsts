import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/config/env.js';

// Único punto del repo con vi.mock: las aserciones que importan aquí (cuerpos de
// error idénticos, ausencia de campos personales) son del contrato HTTP real, no
// de una función interna, y el resto de las pruebas HTTP nunca llega a la base.
const findUnique = vi.fn();
const bitacoraCreate = vi.fn().mockResolvedValue({});

vi.mock('../../src/infrastructure/database/prisma.js', () => ({
  prisma: { constancia: { findUnique: (...args: unknown[]) => findUnique(...args) }, bitacora: { create: (...args: unknown[]) => bitacoraCreate(...args) } },
  withBusinessTransaction: vi.fn(),
  resolveActor: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { crearVerificadorTokens } = await import('../../src/infrastructure/verificacion/token.js');

const env: Env = {
  NODE_ENV: 'test', PORT: 3000, HOST: '127.0.0.1', API_PREFIX: '/api/v1',
  CORS_ORIGINS: ['https://ui.sicef.test'], LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/sicef',
  DIRECT_DATABASE_URL: undefined,
  KEYCLOAK_ISSUER_URL: 'https://keycloak.test/realms/SOAPAP',
  KEYCLOAK_JWKS_URL: 'https://keycloak.test/realms/SOAPAP/protocol/openid-connect/certs',
  KEYCLOAK_CLIENT_ID: 'sicef', KEYCLOAK_AUDIENCE: 'sicef',
  NFS_BASE_PATH: '/tmp/sicef', NFS_EVIDENCIAS_PATH: '/tmp/sicef/evidencias', NFS_CONSTANCIAS_PATH: '/tmp/sicef/constancias', NFS_COMPROBANTES_PATH: '/tmp/sicef/comprobantes',
  MAX_EVIDENCIA_TOTAL_BYTES: 31_457_280,
  SIGNING_SERVICE_URL: 'https://signing.test', SIGNING_SERVICE_AUTH_TOKEN: 'test-token', SIGNING_SERVICE_TIMEOUT_MS: 1_000,
  OUC_API_URL: 'https://ouc.test', OUC_API_TOKEN: 'test-token',
  PUBLIC_BASE_URL: 'https://portal.test', PUBLIC_RATE_LIMIT_WINDOW_MS: 60_000, PUBLIC_RATE_LIMIT_MAX: 1_000,
  SECRETO_VERIFICADOR_V1: 'clave-de-prueba-de-al-menos-32-bytes', SECRETO_VERIFICADOR_V2: undefined, VERSION_TOKEN_ACTUAL: 'v1',
  VERIFICACION_RATE_LIMIT_WINDOW_MS: 60_000, VERIFICACION_RATE_LIMIT_MAX: 1_000,
};

const FOLIO = 'SICEF-42-A1B2C3D4';
const TOKEN = crearVerificadorTokens(env).generarToken(FOLIO);

// Fila tal como la devuelve el select del router, con relaciones anidadas.
function fila(overrides: { tipoConstancia?: 'NO_ADEUDO' | 'NO_REGISTRO'; vigenciaFin?: Date; anulada?: boolean } = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    folioUnico: FOLIO,
    vigenciaFin: overrides.vigenciaFin ?? new Date('2099-01-15T00:00:00.000Z'),
    anulada: overrides.anulada ?? false,
    tramite: {
      tipoConstancia: overrides.tipoConstancia ?? 'NO_ADEUDO',
      domicilioCalle: 'AV REFORMA', domicilioNumero: '612-1', domicilioColonia: 'CENTRO',
      domicilioPerteneceA: 'MUNICIPIO', domicilioPerteneceANombre: 'PUEBLA',
      personas: [{ persona: { nombreRazonSocial: 'Juan Pérez Salinas' } }],
    },
  };
}

const url = (folio: string, token: string) => `/api/v1/public/constancias/${folio}/verificar/${token}`;

beforeEach(() => {
  findUnique.mockReset();
  bitacoraCreate.mockClear().mockResolvedValue({});
});

describe('GET /public/constancias/:folio/verificar/:token', () => {
  it('devuelve 200 con la forma esperada cuando el token es válido', async () => {
    findUnique.mockResolvedValue(fila());
    const response = await request(createApp(env)).get(url(FOLIO, TOKEN));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        valido: true,
        folio: FOLIO,
        tipo: 'NO_ADEUDO',
        estado: 'VIGENTE',
        vigenciaHasta: '2099-01-15T00:00:00.000Z',
        titular: { nombreRazonSocial: 'Juan Pérez Salinas' },
      },
    });
  });

  it('incluye el domicilio del predio en constancias de No Registro', async () => {
    findUnique.mockResolvedValue(fila({ tipoConstancia: 'NO_REGISTRO' }));
    const response = await request(createApp(env)).get(url(FOLIO, TOKEN));
    expect(response.body.data.domicilio).toEqual({ calle: 'AV REFORMA', numero: '612-1', colonia: 'CENTRO', perteneceA: 'MUNICIPIO', perteneceANombre: 'PUEBLA' });
  });

  it('devuelve 200 VENCIDA para una constancia fuera de vigencia', async () => {
    findUnique.mockResolvedValue(fila({ vigenciaFin: new Date('2020-01-01T00:00:00.000Z') }));
    const response = await request(createApp(env)).get(url(FOLIO, TOKEN));
    expect(response.status).toBe(200);
    expect(response.body.data.estado).toBe('VENCIDA');
  });

  it('no expone datos personales fuera del titular ni identificadores internos', async () => {
    findUnique.mockResolvedValue(fila({ tipoConstancia: 'NO_REGISTRO' }));
    const response = await request(createApp(env)).get(url(FOLIO, TOKEN));
    expect(Object.keys(response.body.data).sort()).toEqual(['domicilio', 'estado', 'folio', 'tipo', 'titular', 'valido', 'vigenciaHasta']);
    for (const prohibido of ['rfc', 'personaId', 'tramiteId', 'nis', 'hashPdf', 'hashContenido', 'archivoUuid']) {
      expect(JSON.stringify(response.body), prohibido).not.toContain(prohibido);
    }
  });

  it('responde 404 con cuerpo idéntico ante token alterado, versión desconocida, token malformado y folio inexistente', async () => {
    const app = createApp(env);

    findUnique.mockResolvedValue(fila());
    const alterado = await request(app).get(url(FOLIO, `${TOKEN.slice(0, -1)}${TOKEN.endsWith('a') ? 'b' : 'a'}`));
    const versionDesconocida = await request(app).get(url(FOLIO, `v9.${TOKEN.split('.')[1]}`));
    const malformado = await request(app).get(url(FOLIO, 'sinpunto'));

    findUnique.mockResolvedValue(null);
    const folioInexistente = await request(app).get(url('SICEF-99-FFFFFFFF', crearVerificadorTokens(env).generarToken('SICEF-99-FFFFFFFF')));

    for (const response of [alterado, versionDesconocida, malformado, folioInexistente]) {
      expect(response.status).toBe(404);
    }
    // El requisito central: un atacante no puede distinguir "ese folio no existe"
    // de "tu token está mal", así que los folios no son enumerables.
    expect(versionDesconocida.body).toEqual(alterado.body);
    expect(malformado.body).toEqual(alterado.body);
    expect(folioInexistente.body).toEqual(alterado.body);
  });

  it('registra en bitácora cada intento, con origen PORTAL y sin exponer ip/user-agent en la respuesta', async () => {
    findUnique.mockResolvedValue(null);
    const response = await request(createApp(env)).get(url(FOLIO, TOKEN)).set('user-agent', 'lector-qr/1.0');

    expect(bitacoraCreate).toHaveBeenCalledTimes(1);
    const registrado = bitacoraCreate.mock.calls[0]?.[0]?.data;
    expect(registrado.origen).toBe('PORTAL');
    expect(registrado.accion).toBe('VERIFICAR_QR');
    expect(registrado.detalle).toMatchObject({ folioIntentado: FOLIO, resultado: 'FOLIO_INEXISTENTE' });
    // El trigger de bitácora exige ip y user-agent para PORTAL: se escriben,
    // pero jamás salen en una respuesta.
    expect(registrado.userAgent).toBe('lector-qr/1.0');
    expect(JSON.stringify(response.body)).not.toContain('lector-qr');
  });

  it('aplica el cupo estricto por IP', async () => {
    findUnique.mockResolvedValue(null);
    const app = createApp({ ...env, VERIFICACION_RATE_LIMIT_MAX: 2 });
    const respuestas = [];
    for (let intento = 0; intento < 3; intento += 1) respuestas.push(await request(app).get(url(FOLIO, TOKEN)));
    expect(respuestas.map((r) => r.status)).toEqual([404, 404, 429]);
  });
});

describe('POST /public/constancias/verificar', () => {
  const CODIGO_CORTO = crearVerificadorTokens(env).codigoCorto(FOLIO);
  const endpoint = '/api/v1/public/constancias/verificar';

  it('devuelve 200 con la misma forma que la ruta por QR cuando el código corto es válido', async () => {
    findUnique.mockResolvedValue(fila());
    const response = await request(createApp(env)).post(endpoint).send({ folio: FOLIO, codigo: CODIGO_CORTO });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ valido: true, folio: FOLIO, estado: 'VIGENTE' });
  });

  it('también acepta el token completo pegado en el campo código', async () => {
    findUnique.mockResolvedValue(fila());
    const response = await request(createApp(env)).post(endpoint).send({ folio: FOLIO, codigo: TOKEN });
    expect(response.status).toBe(200);
  });

  it('responde 404 idéntico ante código incorrecto y folio inexistente', async () => {
    const app = createApp(env);
    findUnique.mockResolvedValue(fila());
    const codigoIncorrecto = await request(app).post(endpoint).send({ folio: FOLIO, codigo: 'ffffffff' });
    findUnique.mockResolvedValue(null);
    const folioInexistente = await request(app).post(endpoint).send({ folio: 'SICEF-99-FFFFFFFF', codigo: CODIGO_CORTO });
    expect(codigoIncorrecto.status).toBe(404);
    expect(folioInexistente.status).toBe(404);
    expect(folioInexistente.body).toEqual(codigoIncorrecto.body);
  });

  it('rechaza un body sin folio o sin código', async () => {
    const response = await request(createApp(env)).post(endpoint).send({ folio: FOLIO });
    expect(response.status).toBe(422);
  });

  it('registra en bitácora con la acción VERIFICAR_CODIGO', async () => {
    findUnique.mockResolvedValue(fila());
    await request(createApp(env)).post(endpoint).send({ folio: FOLIO, codigo: CODIGO_CORTO });
    expect(bitacoraCreate).toHaveBeenCalledTimes(1);
    expect(bitacoraCreate.mock.calls[0]?.[0]?.data.accion).toBe('VERIFICAR_CODIGO');
  });
});
