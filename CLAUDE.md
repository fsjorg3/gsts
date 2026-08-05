# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SICEF: sistema para emitir constancias de no adeudo / no registro (SOAPAP). Monorepo npm workspaces:

- `backend/` — Express 5 + Prisma 7 + PostgreSQL.
- `packages/contracts/` — `@sicef/contracts`, esquemas Zod / DTOs compartidos.
- `frontend/` — Vite 8 + React 19 + MUI 9 + react-router 8 + TanStack Query + Redux Toolkit. Fase 1 (Ventanilla, Administración, Bitácora) va contra la API real; Finanzas y Dirección son shells con datos de demostración (`src/mocks/`) porque aún no existen sus endpoints.

Fuera de alcance: el worker de timbrado PAC y la integración OUC (sólo se definen sus puertos en `backend/src/infrastructure/pac` y `ouc`), y el Servicio de Firma (retirado del flujo: su cliente HTTP se conserva sin uso).

## Commands

From repo root (workspaces): `npm run build | check | test`.

In `backend/`:

```bash
npm run dev              # tsx watch src/server.ts
npm run check            # tsc --noEmit
npm run test             # vitest run
npx vitest run tests/unit/claims.test.ts   # single test file
npm run prisma:generate
npm run prisma:migrate   # prisma migrate deploy (never migrate dev in prod)
```

In `frontend/`:

```bash
npm run dev              # vite en :5173, proxy /api/v1 → 127.0.0.1:3000
npm run check            # tsc --noEmit
npm run test             # vitest run (jsdom)
npx vitest run src/features/tramites/derivarPaso.test.ts   # single test file
npm run gen:api          # regenera src/api/schema.d.ts desde el backend corriendo
```

Both apps refuse to run without their env: backend valida todo en [env.ts](backend/src/config/env.ts), frontend usa `VITE_API_BASE_URL`, `VITE_KEYCLOAK_AUTHORITY`, `VITE_KEYCLOAK_CLIENT_ID` (copiar `.env.example` → `.env` en cada uno). Dev/test databases start empty — there is no seed for catalogs; a `ti` actor configures them via the API.

## Backend architecture

Monolito modular. Each domain module in `backend/src/modules/` owns its router/validators; modules never call each other over HTTP. Everything mounts under `/api/v1` in [router.ts](backend/src/api/router.ts) — note the mounting order: specialized `/tramites/:tramiteId/...` sub-routers (evidencias, validaciones, borradores-cobro, cobros, constancias) are mounted **before** the generic `/tramites` router, each with its own auth + role middleware chain.

### Request flow for internal routes

1. `createAuthenticate(env)` ([auth/middleware.ts](backend/src/modules/auth/middleware.ts)) verifies the Keycloak JWT (realm `SOAPAP`, client/audience `sicef`) via JWKS. Roles come straight from claims — `ventanilla`/`finanzas` from `resource_access.sicef.roles`, `ti`/`direccion` from `realm_access.roles` — and are never persisted or mapped to local roles.
2. `bindActor` upserts a pseudonymous `actor` row keyed only by `sub` (`resolveActor`). No name/email/roles are ever stored.
3. `requireRoles(...)` gates by claim.
4. Handlers build a `DatabaseContext` via `requestContext(request)` and run mutations inside `withBusinessTransaction` ([prisma.ts](backend/src/infrastructure/database/prisma.ts)), which sets `app.actor_id`, `app.roles`, `app.request_id` with `set_config(..., true)` so SQL triggers can enforce/audit.
5. Any business mutation must write a `bitacora` entry **in the same transaction** via [auditoria/service.ts](backend/src/modules/auditoria/service.ts).

Public routes (`/api/v1/public`: solicitud de factura, consulta CFDI, verificación de constancia) skip auth but get rate limiting and bitácora with origin `PORTAL`.

### Database owns the hard rules

The database installs in **two steps**: `backend/prisma/migrations/` holds only the Prisma-generated structure, and `backend/prisma/migration_complementaria.sql` holds the hand-written SQL rules run **after** it — CHECK constraints, partial unique indexes (one active catalog/tarifa version), immutability triggers, append-only bitácora, and state-transition enforcement. `prisma migrate` alone does **not** install the complementary rules; run the complementary file separately, and never `prisma migrate reset` against a base initialized with `init_postgres_soapap3.sql` without re-granting (see [backend/README.md](backend/README.md)). Prisma does not express these — when changing the schema, keep the complementary SQL in sync. Published catalogs/tarifas are never edited; functional changes are new versions.

### Infrastructure adapters

`backend/src/infrastructure/`: `storage/` (NFS paths + hashes for evidencias/constancias/facturas/comprobantes — evidencias, comprobantes y facturas llegan Base64 dentro del JSON, de ahí el límite de body de 42mb), `signing/` (cliente del Servicio de Firma — **sin uso**: el servicio quedó fuera del proyecto tentativamente, así que la emisión no firma y `firmaDigital`/`certificadoId` quedan en `null`; se conserva por si vuelve), `pac/` and `ouc/` (ports only).

**La constancia es la excepción: el backend la genera, no la recibe.** `backend/src/modules/constancias/plantillas/` renderiza el PDF con PDFKit y estampa el QR de verificación; el texto legal de cada tipo vive en su propia plantilla y el registro `PLANTILLAS` es parcial a propósito (sólo existe la del tipo cuyo texto está aprobado — hoy `NO_REGISTRO`). Los logotipos institucionales están en `backend/recursos/logotipos/`, fuera de `src/`, y se resuelven relativo al módulo: `dist/` espeja `src/`, así que la misma ruta sirve en dev y en producción sin pasos de build. La vigencia y el firmante impresos salen de `ConfiguracionConstancia` (una fila por tipo, sin valores por defecto).

## The API contract is the seam

Two artifacts define the backend⇄frontend boundary and must stay in sync:

- `@sicef/contracts` (`packages/contracts/src/index.ts`) — Zod schemas / DTOs used for API validation. Add request/response schemas there, not inline in routers.
- [openapi.ts](backend/src/api/openapi.ts) — documento OpenAPI escrito a mano que registra cada schema (vía `zodToJsonSchema`) y cada path; se sirve en `GET /api/v1/openapi.json`. Los pocos requests que un router valida con un schema local tienen aquí un *mirror* explícito.

`backend/tests/contract/openapi.test.ts` mantiene un inventario literal `[método, ruta]`: **agregar o renombrar una ruta rompe esa prueba hasta que se actualice `openapi.ts`**. El frontend consume ese documento con `npm run gen:api` → `frontend/src/api/schema.d.ts`, y todos sus tipos salen de ahí (`components['schemas']['Tramite']`), nunca se redeclaran a mano.

Convenciones de alambre: éxito `{ data, requestId? }`, listas `{ data, meta.nextCursor?, requestId? }` (paginación por cursor), error `{ error: { code, message, details? } }`.

## Frontend architecture

- `src/features/<dominio>/` — cada feature tiene su `api.ts` con `queryOptions`/`infiniteQueryOptions` y hooks `useMutation` de TanStack Query; los componentes no llaman a `api` directamente.
- Estado: **TanStack Query para estado del servidor, Redux Toolkit sólo para estado de UI** (`src/store/`: notificaciones y preferencias). No duplicar datos del servidor en Redux.
- HTTP: [client.ts](frontend/src/api/client.ts) (`openapi-fetch` tipado con `paths`) inyecta el bearer token y convierte cualquier respuesta no-ok en `ApiError`; [errors.ts](frontend/src/api/errors.ts) traduce el `code` del contrato a copy es-MX (`copyDeError`) — al agregar un código de error en el backend, agregar aquí su copy.
- Auth: Keycloak Authorization Code + PKCE vía `oidc-client-ts`; el `userManager` ([oidc.ts](frontend/src/auth/oidc.ts)) se comparte entre React y el cliente HTTP. **Los roles se leen de `GET /auth/me`, nunca de los claims del token en la UI** ([useAuth.ts](frontend/src/auth/useAuth.ts)).
- Navegación: [modulos.ts](frontend/src/app/layout/modulos.ts) es la fuente única de los módulos — el sidebar filtra por rol y la ruta índice redirige al primer módulo accesible en ese orden. Cada ruta se envuelve además en `<RequireRole>`.
- Tema: [theme.ts](frontend/src/app/theme.ts) implementa el design system institucional SOAPAP (Institutional Flat System: vino/oro, Montserrat, sin sombras, variantes `standard`/`outstanding` en Paper y Card). Fuentes e iconos (Material Symbols vía `MsIcon`) son self-hosted, sin CDN.
- Imports con alias `@/` (configurado en `vite.config.ts` y `tsconfig.json`), **sin** extensión `.js` — a diferencia del backend.

## Conventions

- ESM (`"type": "module"`) with NodeNext resolution — intra-package imports en backend/contracts usan extensión `.js`.
- Strict TS with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Errors: throw `AppError(status, code, message)` from [shared/errors.ts](backend/src/shared/errors.ts); the central `errorHandler` normalizes responses.
- Logging (Pino): never log tokens, `sub`, RFC, names, or emails — the redact list in [app.ts](backend/src/app.ts) is a backstop, not permission. Log only `actor_id`, `request_id`, route, status, duration. `bitacora` nunca expone `ip_address`/`user_agent`: se excluyen en el `select` de Prisma, no sólo en el DTO.
- Code, comments, and API messages are in Spanish.

## Reference docs

En `documentacion/` (autoritativos, en este orden de utilidad):

- `CONTRATO_API_SICEF.md` — contrato de la API, máquinas de estado y catálogo de códigos de error.
- `PENDIENTES_BACKEND_FRONTEND.md` — backlog vivo de endpoints que el frontend necesita y el backend aún no expone (explica por qué Finanzas y Dirección usan mocks).
- `GUIA_MODELO_SICNAF_Y_CATALOGOS.md` — modelo de datos y reglas de versionado de catálogos.
- `STACK_BACKEND_SICEF.md` / `STACK_FRONTEND_SICEF.md` — decisiones de stack, variables de entorno, criterios de aceptación.
- `GUIA_DESPLIEGUE_BASE_DATOS.md` e `init_postgres_soapap3.sql` — roles, aislamiento y permisos de PostgreSQL.
