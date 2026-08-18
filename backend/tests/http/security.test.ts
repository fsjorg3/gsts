import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
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
  PUBLIC_BASE_URL: 'https://portal.test', PUBLIC_RATE_LIMIT_WINDOW_MS: 60_000, PUBLIC_RATE_LIMIT_MAX: 2,
  SECRETO_VERIFICADOR_V1: 'clave-de-prueba-de-al-menos-32-bytes', SECRETO_VERIFICADOR_V2: undefined, VERSION_TOKEN_ACTUAL: 'v1',
  VERIFICACION_RATE_LIMIT_WINDOW_MS: 60_000, VERIFICACION_RATE_LIMIT_MAX: 2,
};

describe('controles HTTP', () => {
  it('expone salud sin autenticación y aplica CORS al origen permitido', async () => {
    const response = await request(createApp(env)).get('/api/v1/health').set('origin', 'https://ui.sicef.test');
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://ui.sicef.test');
  });

  it('rechaza un bearer que no es JWT antes de consultar datos internos', async () => {
    const response = await request(createApp(env)).get('/api/v1/auth/me').set('authorization', 'Bearer no-es-un-jwt');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('mantiene protegidos los subrouters internos por caso de uso', async () => {
    const app = createApp(env);
    const requests = [
      request(app).get('/api/v1/auth/me'),
      request(app).get('/api/v1/catalogos/requisitos/activo'),
      // Edición y borrado del borrador de catálogo (rol ti).
      request(app).delete('/api/v1/catalogos/requisitos/00000000-0000-0000-0000-000000000000'),
      request(app).patch('/api/v1/catalogos/grupos/00000000-0000-0000-0000-000000000000'),
      request(app).delete('/api/v1/catalogos/grupos/00000000-0000-0000-0000-000000000000'),
      request(app).patch('/api/v1/catalogos/opciones/00000000-0000-0000-0000-000000000000'),
      request(app).delete('/api/v1/catalogos/opciones/00000000-0000-0000-0000-000000000000'),
      request(app).patch('/api/v1/catalogos/documentos/00000000-0000-0000-0000-000000000000'),
      request(app).delete('/api/v1/catalogos/documentos/00000000-0000-0000-0000-000000000000'),
      request(app).put('/api/v1/administracion/plazos'),
      request(app).get('/api/v1/administracion/constancias/NO_REGISTRO'),
      request(app).put('/api/v1/administracion/constancias/NO_REGISTRO'),
      request(app).get('/api/v1/tramites'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/evidencias'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/validaciones/no-adeudo'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/validaciones/no-registro'),
      request(app).get('/api/v1/tramites/00000000-0000-0000-0000-000000000000/borradores-cobro'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/borradores-cobro'),
      request(app).patch('/api/v1/tramites/00000000-0000-0000-0000-000000000000/borradores-cobro/00000000-0000-0000-0000-000000000000'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/borradores-cobro/00000000-0000-0000-0000-000000000000/aplicar'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/cobros'),
      request(app).post('/api/v1/tramites/00000000-0000-0000-0000-000000000000/constancias'),
      request(app).get('/api/v1/tramites/00000000-0000-0000-0000-000000000000/constancias/00000000-0000-0000-0000-000000000000/archivo'),
      // Superficie hacia Finanzas: sólo service account, nunca anónima.
      request(app).get('/api/v1/constancias/GSTS-1-ABCD1234/cobro'),
      request(app).get('/api/v1/constancias/GSTS-1-ABCD1234/cobro/comprobante'),
      request(app).get('/api/v1/direccion/metricas'),
    ];
    const responses = await Promise.all(requests);
    for (const response of responses) expect(response.status).toBe(401);
  });

  it('limita rutas públicas', async () => {
    const app = createApp(env);
    await request(app).get('/api/v1/public/constancias/inexistente');
    await request(app).get('/api/v1/public/constancias/inexistente');
    const limited = await request(app).get('/api/v1/public/constancias/inexistente');
    expect(limited.status).toBe(429);
  });
});
