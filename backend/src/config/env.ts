import { z } from 'zod';

// 32 bytes es el tamaño del bloque de SHA-256: por debajo de eso la clave HMAC
// se comprime y pierde entropía. Se mide en bytes, no en caracteres, porque un
// secreto con acentos o emoji ocupa más de un byte por carácter.
const secretoVerificador = z
  .string()
  .refine((valor) => Buffer.byteLength(valor, 'utf8') >= 32, 'debe medir al menos 32 bytes');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CORS_ORIGINS: z.string().transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url().optional(),
  KEYCLOAK_ISSUER_URL: z.string().url(),
  KEYCLOAK_JWKS_URL: z.string().url(),
  KEYCLOAK_CLIENT_ID: z.literal('sicef'),
  KEYCLOAK_AUDIENCE: z.literal('sicef'),
  NFS_BASE_PATH: z.string().min(1),
  NFS_EVIDENCIAS_PATH: z.string().min(1),
  NFS_CONSTANCIAS_PATH: z.string().min(1),
  NFS_COMPROBANTES_PATH: z.string().min(1),
  MAX_EVIDENCIA_TOTAL_BYTES: z.coerce.number().int().positive().default(31_457_280),
  SIGNING_SERVICE_URL: z.string().url(),
  SIGNING_SERVICE_AUTH_TOKEN: z.string().min(1),
  SIGNING_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  OUC_API_URL: z.string().url(),
  OUC_API_TOKEN: z.string().min(1),
  PUBLIC_BASE_URL: z.string().url(),
  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  // Claves HMAC del token de verificación de constancias, versionadas para
  // poder rotarlas: los documentos ya emitidos siguen verificándose con la
  // versión con la que nacieron. Una versión sólo se retira cuando ninguna
  // constancia vigente la referencia (columna constancia.version_token).
  SECRETO_VERIFICADOR_V1: secretoVerificador,
  SECRETO_VERIFICADOR_V2: secretoVerificador.optional(),
  VERSION_TOKEN_ACTUAL: z.string().regex(/^v\d+$/, 'debe tener la forma v1, v2, …').default('v1'),
  // Cupo propio, más estricto que el global de /public: el token va truncado y
  // la respuesta expone titular y domicilio.
  VERIFICACION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  VERIFICACION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
