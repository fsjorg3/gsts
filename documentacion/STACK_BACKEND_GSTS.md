# Stack backend para el monorepo SICEF

## 1. Propósito y alcance

Esta guía define la base técnica del nuevo monorepo SICEF. El repositorio contendrá `backend` y `frontend`, pero este documento especifica solamente el backend y su relación con la infraestructura institucional.

El backend será la única puerta para las operaciones de negocio. El frontend consumirá su API y nunca tendrá acceso directo a PostgreSQL, NFS, secretos, administración de Keycloak ni al Servicio de Firma.

Queda fuera de alcance el worker de timbrado. La API conservará los contratos, estados e integraciones necesarios para que un proyecto posterior pueda consumir los trabajos de facturación sin rediseñar el dominio.

## 2. Stack recomendado

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Runtime | Node.js 24 LTS | Ejecución estable del backend. |
| Lenguaje y paquetes | TypeScript estricto + npm workspaces | Tipado de dominio y administración del monorepo. |
| API HTTP | Express 5 | API REST bajo `/api/v1`, middleware y manejo de errores. |
| Validación | Zod | Validar entradas HTTP, variables de entorno y contratos internos. |
| Persistencia | PostgreSQL 18 + Prisma 7 | Consultas tipadas, esquema y migraciones estructurales. |
| Integridad SQL | Migraciones SQL complementarias | Triggers, constraints, bitácora append-only, inmutabilidad y transiciones de estado. |
| Pool de conexiones | PgBouncer | Limitar y reutilizar conexiones entre la API y PostgreSQL. |
| Autenticación | Keycloak OIDC/JWKS | Verificación de tokens y SSO institucional. |
| Autorización | Claims de Keycloak + RBAC en API | Roles literales `ventanilla`, `finanzas`, `ti` y `direccion`; SICEF no persiste roles personales. |
| Archivos | NFS | Evidencias, constancias, XML y PDF mediante referencias lógicas en PostgreSQL. |
| Seguridad HTTP | Helmet, CORS y rate limiting | Cabeceras seguras, orígenes permitidos y protección de rutas públicas. |
| Observabilidad | Pino | Logs JSON con `request_id` y redacción de secretos o datos sensibles. |
| Contrato API | OpenAPI 3 | Contrato versionado para el frontend y pruebas de integración. |
| Pruebas | Vitest + Supertest | Pruebas unitarias, integración HTTP y contratos. |

Usar versiones LTS de Node.js en entornos de desarrollo y despliegue. Express 5 y Prisma 7 son la base compatible con TypeScript definida para este proyecto. Referencias: [Node.js Releases](https://nodejs.org/en/about/previous-releases), [Express](https://expressjs.com/), [Prisma ORM](https://www.prisma.io/docs/orm).

## 3. Arquitectura del backend

El backend será un monolito modular. Cada módulo concentra rutas, casos de uso, validadores y acceso a infraestructura de un dominio; los módulos no se conectan entre sí mediante HTTP.

Las operaciones que modifiquen el negocio deben usar transacciones de Prisma y crear la entrada correspondiente en `bitacora` dentro de la misma transacción. PostgreSQL conserva la autoridad sobre restricciones críticas: estados, plazos, unicidad, inmutabilidad y conservación histórica.

### Integraciones y límites

- **Keycloak:** realm fijo `SOAPAP`, cliente `sicef`. El backend valida emisor, audiencia, firma, vigencia y `sub`; toma `ventanilla` y `finanzas` de `resource_access.sicef.roles`, y `ti` y `direccion` de `realm_access.roles`. No transforma esos claims ni los convierte a un rol local.
- **Actor mínimo:** tras validar un token autorizado, el backend resuelve o crea idempotentemente `actor` usando sólo `sub`. Ese UUID local permite FKs y auditoría; nunca se almacenan nombre, correo, contraseña, sesiones ni roles.
- **Contexto SQL:** antes de una operación de negocio, la transacción establece `app.actor_id`, `app.roles` y `app.request_id` con `set_config(..., true)`. Es una defensa de consistencia adicional, no un sustituto de la validación OIDC en la API.
- **NFS:** un adaptador encapsula rutas, hashes, tamaño y almacenamiento de evidencias y documentos generados.
- **Servicio de Firma:** el backend calcula el hash SHA-256 y solicita la firma mediante un adaptador autenticado; nunca manipula la clave privada institucional.
- **PAC y OUC:** se definen interfaces y configuración para sus clientes. El consumo asíncrono del PAC y sus reintentos pertenecen al worker futuro.
- **Rutas públicas:** envío de datos fiscales, consulta de CFDI y verificación de constancia deben tener límites de tasa, validación estricta y bitácora con origen `PORTAL`.

## 4. Árbol de directorios

```text
sicef/
├─ backend/
│  ├─ src/
│  │  ├─ api/                    # Router /api/v1, controladores y OpenAPI
│  │  ├─ config/                 # Carga y validación de variables de entorno
│  │  ├─ middlewares/            # Auth, RBAC, request_id, errores, rate limiting
│  │  ├─ modules/
│  │  │  ├─ auth/                # Validación OIDC, claims y contexto transaccional
│  │  │  ├─ actores/             # Proyección pseudónima idempotente del sub de Keycloak
│  │  │  ├─ catalogos/           # Requisitos, tarifas y asistente administrativo
│  │  │  ├─ tramites/            # Captura, estados, personas y expediente
│  │  │  ├─ evidencias/          # Metadatos y carga de archivos
│  │  │  ├─ validaciones/        # No adeudo y confirmaciones manuales
│  │  │  ├─ cobros/              # Borrador, validación y cobro definitivo
│  │  │  ├─ constancias/         # Emisión, hash, firma y folio
│  │  │  ├─ facturacion/         # Solicitud pública y consulta de CFDI
│  │  │  ├─ verificacion-publica/# Consulta pública de constancias
│  │  │  ├─ administracion/      # Plazos y catálogos: acceso con claim ti
│  │  │  └─ auditoria/           # Escritura transaccional de bitácora
│  │  ├─ infrastructure/
│  │  │  ├─ database/            # Prisma y transacciones
│  │  │  ├─ storage/             # Adaptador NFS
│  │  │  ├─ keycloak/            # Cliente OIDC/JWKS
│  │  │  ├─ signing/             # Puerto y cliente del Servicio de Firma
│  │  │  ├─ pac/                 # Puerto para el worker futuro
│  │  │  └─ ouc/                 # Puerto de validación de no adeudo
│  │  ├─ shared/                 # Errores, utilidades, tipos y constantes
│  │  ├─ app.ts                  # Configura Express sin abrir el puerto
│  │  └─ server.ts               # Arranque y apagado controlado
│  ├─ tests/
│  │  ├─ unit/
│  │  ├─ integration/
│  │  └─ contract/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  │     └─ 0001_init/
│  │        └─ migration.sql # Estructura y reglas SQL complementarias
│  ├─ .env                       # Local; nunca se versiona
│  └─ .env.example               # Plantilla sin secretos
├─ frontend/                     # Consumidor de la API; fuera de este documento
├─ packages/
│  ├─ contracts/                 # DTOs, esquemas Zod y tipos compartidos
│  ├─ eslint-config/
│  └─ tsconfig/
├─ docs/
│  └─ openapi/
└─ package.json
```

## 5. Fuente de datos y migraciones

El nuevo monorepo reutilizará como fuente de datos los siguientes artefactos trabajados en este proyecto:

- `backend/prisma/schema.prisma`;
- `backend/prisma/migrations/0001_init/migration.sql`, que incluye la estructura y las reglas SQL complementarias.

La migración inicial incorpora la estructura y las reglas complementarias en un solo artefacto desplegable. En producción se aplica con una cuenta de migración (`sicef_owner`); la API se ejecuta con la cuenta limitada `sicef_app` a través de PgBouncer.

No usar `prisma migrate dev` en producción. Usar `prisma migrate deploy` con las migraciones previamente revisadas y probadas en un entorno de staging.

## 6. Variables de entorno del backend

Crear `backend/.env` para cada entorno y `backend/.env.example` como plantilla versionada. El archivo `.env` contiene valores reales, debe estar en `.gitignore` y se valida al iniciar mediante Zod. Nunca se deben registrar secretos en Pino ni incluirlos en OpenAPI.

```env
# Aplicación
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=debug

# PostgreSQL / Prisma
DATABASE_URL=postgresql://sicef_app:<PASSWORD>@<PGBOUNCER_HOST>:6432/sicef_db?schema=public
DIRECT_DATABASE_URL=postgresql://sicef_owner:<PASSWORD>@<POSTGRES_HOST>:5432/sicef_db?schema=public

# Keycloak
KEYCLOAK_ISSUER_URL=https://<KEYCLOAK_HOST>/realms/SOAPAP
KEYCLOAK_JWKS_URL=https://<KEYCLOAK_HOST>/realms/SOAPAP/protocol/openid-connect/certs
KEYCLOAK_CLIENT_ID=sicef
KEYCLOAK_AUDIENCE=sicef

# Archivos NFS
NFS_BASE_PATH=/mnt/sicef
NFS_EVIDENCIAS_PATH=/mnt/sicef/evidencias
NFS_CONSTANCIAS_PATH=/mnt/sicef/constancias
NFS_FACTURAS_PATH=/mnt/sicef/facturas
NFS_COMPROBANTES_PATH=/mnt/sicef/comprobantes
MAX_EVIDENCIA_TOTAL_BYTES=31457280

# Servicio de Firma
SIGNING_SERVICE_URL=https://<SIGNING_HOST>
SIGNING_SERVICE_AUTH_TOKEN=<SECRET>
SIGNING_SERVICE_TIMEOUT_MS=10000

# PAC y OUC: contratos preparados; worker fuera de alcance
PAC_BASE_URL=https://<PAC_SANDBOX_OR_PROD>
PAC_API_KEY=<SECRET>
OUC_API_URL=https://<OUC_HOST>
OUC_API_TOKEN=<SECRET>

# Rutas públicas y protección
PUBLIC_BASE_URL=https://<PORTAL_HOST>
PUBLIC_RATE_LIMIT_WINDOW_MS=60000
PUBLIC_RATE_LIMIT_MAX=30

# Verificación de constancias por QR (HMAC versionado; mínimo 32 bytes por clave)
SECRETO_VERIFICADOR_V1=<SECRET>
# SECRETO_VERIFICADOR_V2=<SECRET>   # sólo durante y después de una rotación
VERSION_TOKEN_ACTUAL=v1
VERIFICACION_RATE_LIMIT_WINDOW_MS=60000
VERIFICACION_RATE_LIMIT_MAX=10
```

Las claves del verificador se rotan definiendo `SECRETO_VERIFICADOR_V2` y apuntando `VERSION_TOKEN_ACTUAL` a `v2`. La versión anterior **no se elimina** mientras existan constancias vigentes emitidas con ella: `constancia.version_token` indica cuándo puede retirarse (`SELECT DISTINCT version_token FROM constancia WHERE vigencia_fin >= now() AND NOT anulada`).

`DIRECT_DATABASE_URL` se reserva para migraciones y administración controlada. No debe estar disponible para el proceso normal de la API en producción.

## 7. Pruebas mínimas

- **Unitarias:** reglas de casos de uso, cálculos de importes, permisos y validadores Zod.
- **Integración:** Prisma/PostgreSQL, transacciones, constraints SQL, triggers y adaptador NFS simulado.
- **HTTP:** rechazo de emisor, audiencia, firma, vigencia, `sub` o roles inválidos; roles de cliente y realm, errores normalizados, `request_id`, CORS y rutas públicas.
- **Contrato:** generación y verificación de OpenAPI frente a los DTOs y esquemas compartidos.
- **Seguridad:** datos fiscales, `sub`, tokens, nombres, correos y secretos ausentes de Pino; registrar exclusivamente `actor_id`, `request_id`, ruta, código y duración. Rechazar roles no autorizados y accesos públicos fuera de límite.

## 8. Criterios de aceptación para el nuevo repositorio

1. El backend inicia sólo si todas las variables requeridas son válidas.
2. El frontend consume exclusivamente OpenAPI/API HTTP; no conoce credenciales de infraestructura.
3. Prisma, las migraciones y la migración complementaria conservan las reglas de integridad del modelo actual.
4. Las rutas internas verifican token y rol; las rutas públicas aplican validación, rate limit y auditoría.
5. No se implementa worker, cola de timbrado ni reintentos del PAC en este monorepo durante esta fase.
