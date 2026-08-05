import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { openApiDocument } from '../../src/api/openapi.js';
import type { Env } from '../../src/config/env.js';

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

// Inventario explícito de todas las operaciones esperadas: [método, ruta]. Si alguien
// borra o renombra una ruta sin actualizar openapi.ts, esta prueba lo detecta.
const OPERACIONES_ESPERADAS: Array<[string, string]> = [
  ['get', '/health'], ['get', '/ready'], ['get', '/openapi.json'],
  ['get', '/public/constancias/{folio}/verificar/{token}'],
  ['get', '/auth/me'],
  ['get', '/catalogos/requisitos/activo'], ['get', '/catalogos/requisitos'], ['post', '/catalogos/requisitos'],
  ['get', '/catalogos/requisitos/{id}/validar'], ['get', '/catalogos/requisitos/{id}/vista-previa'],
  ['post', '/catalogos/requisitos/{id}/publicar'], ['post', '/catalogos/requisitos/{id}/grupos'],
  ['post', '/catalogos/grupos/{id}/opciones'], ['post', '/catalogos/opciones/{id}/documentos'],
  ['get', '/catalogos/tarifas/activas'],
  ['post', '/catalogos/tarifas'], ['post', '/catalogos/tarifas/{id}/publicar'],
  ['get', '/administracion/plazos'], ['put', '/administracion/plazos'],
  ['get', '/administracion/constancias/{tipo}'], ['put', '/administracion/constancias/{tipo}'],
  ['get', '/personas'], ['post', '/personas'],
  ['get', '/motivos-reduccion'], ['post', '/motivos-reduccion'], ['patch', '/motivos-reduccion/{id}'],
  ['get', '/bitacora'],
  ['get', '/tramites'], ['post', '/tramites'], ['get', '/tramites/{id}'], ['post', '/tramites/{id}/{accion}'],
  ['post', '/tramites/{id}/evidencias'], ['patch', '/tramites/{id}/evidencias/{evidenciaId}'],
  ['post', '/tramites/{id}/validaciones/no-adeudo'],
  ['get', '/tramites/{id}/borradores-cobro'], ['post', '/tramites/{id}/borradores-cobro'],
  ['patch', '/tramites/{id}/borradores-cobro/{borradorId}'], ['post', '/tramites/{id}/borradores-cobro/{borradorId}/aplicar'],
  ['post', '/tramites/{id}/cobros'], ['post', '/tramites/{id}/constancias'],
  ['get', '/tramites/{id}/constancias/{constanciaId}/archivo'],
  // Superficie de sólo lectura hacia el sistema Finanzas (service account).
  ['get', '/constancias/{folio}/cobro'], ['get', '/constancias/{folio}/cobro/comprobante'],
  ['get', '/direccion/metricas'],
];

// Mutaciones donde el router realmente valida un body (evidencia extraída de cada
// router.*.ts). Publicar y aplicar no reciben body: son disparadores de transición.
const RUTAS_CON_REQUEST_BODY = new Set([
  'post /catalogos/requisitos', 'post /catalogos/requisitos/{id}/grupos', 'post /catalogos/grupos/{id}/opciones',
  'post /catalogos/opciones/{id}/documentos', 'post /catalogos/tarifas', 'put /administracion/plazos',
  'post /personas', 'post /motivos-reduccion', 'patch /motivos-reduccion/{id}',
  'put /administracion/constancias/{tipo}',
  'post /tramites', 'post /tramites/{id}/evidencias', 'patch /tramites/{id}/evidencias/{evidenciaId}',
  'post /tramites/{id}/validaciones/no-adeudo',
  'post /tramites/{id}/borradores-cobro', 'patch /tramites/{id}/borradores-cobro/{borradorId}',
  'post /tramites/{id}/cobros',
]);

type OperationObject = { responses?: Record<string, unknown>; requestBody?: unknown };
type PathItem = Record<string, OperationObject>;
const paths = openApiDocument.paths as unknown as Record<string, PathItem>;
const schemas = openApiDocument.components.schemas as Record<string, unknown>;

describe('contrato OpenAPI', () => {
  it('GET /openapi.json responde 200 con el documento servido por la API', async () => {
    const response = await request(createApp(env)).get('/api/v1/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(Object.keys(response.body.paths).length).toBe(OPERACIONES_ESPERADAS.length > 0 ? Object.keys(paths).length : 0);
  });

  it('no tiene referencias $ref rotas hacia components.schemas', () => {
    const json = JSON.stringify(openApiDocument);
    const refs = [...json.matchAll(/#\/components\/schemas\/([A-Za-z_]+)/g)].map((match) => match[1] as string);
    const definidos = new Set(Object.keys(schemas));
    const rotos = [...new Set(refs)].filter((nombre) => !definidos.has(nombre));
    expect(rotos).toEqual([]);
  });

  it.each(OPERACIONES_ESPERADAS)('declara %s %s con responses', (metodo, ruta) => {
    const operacion = paths[ruta]?.[metodo];
    expect(operacion, `falta ${metodo.toUpperCase()} ${ruta} en openApiDocument.paths`).toBeDefined();
    expect(Object.keys(operacion?.responses ?? {}).length).toBeGreaterThan(0);
  });

  it('toda ruta que valida un body en su router declara requestBody en OpenAPI', () => {
    for (const clave of RUTAS_CON_REQUEST_BODY) {
      const [metodo, ...resto] = clave.split(' ');
      const ruta = resto.join(' ');
      const operacion = paths[ruta]?.[metodo as string];
      expect(operacion?.requestBody, `falta requestBody en ${clave}`).toBeDefined();
    }
  });

  it('no hay más operaciones documentadas que las esperadas (detecta rutas huérfanas)', () => {
    const documentadas = Object.entries(paths).flatMap(([ruta, item]) => Object.keys(item).map((metodo) => `${metodo} ${ruta}`));
    const esperadas = OPERACIONES_ESPERADAS.map(([metodo, ruta]) => `${metodo} ${ruta}`);
    expect(documentadas.sort()).toEqual(esperadas.sort());
  });

  it('el schema Tramite tiene las propiedades canónicas del modelo', () => {
    const tramite = schemas['Tramite'] as { properties?: Record<string, unknown> };
    expect(Object.keys(tramite.properties ?? {})).toEqual(expect.arrayContaining(['id', 'numeroTramite', 'estado', 'tipoConstancia', 'personalidad', 'representacion']));
  });

  it('el schema Cobro serializa los montos Decimal como string', () => {
    const cobro = schemas['Cobro'] as { properties?: Record<string, { type?: string }> };
    expect(cobro.properties?.montoBase?.type).toBe('string');
    expect(cobro.properties?.montoFinal?.type).toBe('string');
  });

  it('el schema Error refleja el formato real de errorHandler', () => {
    const error = schemas['Error'] as { properties?: Record<string, unknown> };
    expect(error.properties).toHaveProperty('error');
  });
});
