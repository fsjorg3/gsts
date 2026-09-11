# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GSTS: la plataforma de la Gerencia de Supervisión Técnica de los Servicios (SOAPAP). Constancias
de no adeudo / no registro es su primer dominio — Atención Ciudadana (quejas) es la siguiente idea,
todavía no construida. Monorepo npm workspaces:

- `backend/` — Express 5 + Prisma 7 + PostgreSQL.
- `packages/contracts/` — `@gsts/contracts`, esquemas Zod / DTOs compartidos.
- `frontend/` — Vite 8 + React 19 + MUI 9 + react-router 8 + TanStack Query + Redux Toolkit. Tres módulos, todos contra la API real: Ventanilla, Administración y Bitácora.

**La facturación no vive aquí.** Se extrajo a un sistema independiente («Finanzas»), con su propio repositorio, backend, frontend y base de datos, desplegado en otra VM/LXC — porque SOAPAP debe facturar también permisos de descarga y penalizaciones, que no cuelgan de un trámite de constancia. GSTS conserva el cobro (es lo que habilita la entrega de la constancia en ventanilla) pero no emite CFDI. El diseño de ambos sistemas está en `documentacion2/`.

GSTS expone a Finanzas **tres rutas de sólo lectura** y no consume nada de él: `GET /constancias/{folio}/cobro`, `GET /constancias/{folio}/cobro/comprobante` y `GET /direccion/metricas`. Se llavean por el folio de la constancia —único e impreso en el documento—, nunca por `cobro.referenciaPago`, que es texto libre, opcional y sin unicidad.

GSTS expone además al **portal institucional** dos rutas bajo `/portal/constancias/...` —mismo resultado que `GET /public/constancias/{folio}/verificar/{token}` y `POST /public/constancias/verificar`, pero autenticadas: las llama el backend del portal servidor a servidor con el rol de **realm** `portal-institucional`, nunca el navegador del ciudadano. `/public` sigue sin auth, íntegra: el ciudadano puede seguir verificando directo desde el frontend de GSTS (`frontend/src/features/verificacion-publica/`) o desde el portal, sin que uno reemplace al otro.

Fuera de alcance: la integración OUC (sólo se define su puerto en `backend/src/infrastructure/ouc`) y el Servicio de Firma (retirado del flujo: su cliente HTTP se conserva sin uso).

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

Monolito modular. `backend/src/modules/` se divide en transversales de primer nivel (`auth/`, `auditoria/`, `actores/`, `sistema/`, `personas/`, `bitacora/` — lo que un dominio futuro como `quejas/` necesitará igual) y de dominio bajo `modules/constancias/` (`administracion/`, `catalogos/`, `cobros/`, `constancias/`, `direccion/`, `evidencias/`, `motivos-reduccion/`, `publico/`, `tramites/`, `validaciones/`). Each domain module owns its router/validators; modules never call each other over HTTP. Everything mounts under `/api/v1` in [router.ts](backend/src/api/router.ts) — note the mounting order: specialized `/tramites/:tramiteId/...` sub-routers (evidencias, validaciones, borradores-cobro, cobros, constancias) are mounted **before** the generic `/tramites` router, each with its own auth + role middleware chain.

### Request flow for internal routes

1. `createAuthenticate(env)` ([auth/middleware.ts](backend/src/modules/auth/middleware.ts)) verifies the Keycloak JWT (realm `SOAPAP`, client/audience `gsts`) via JWKS. Roles come straight from claims — `ventanilla` y los de service account `consulta-cobros`/`consulta-metricas` from `resource_access.gsts.roles`, `ti`/`direccion`/`portal-institucional` (service account del backend del portal institucional) from `realm_access.roles` — and are never persisted or mapped to local roles. El rol `finanzas` **ya no existe en GSTS**: pertenece al otro sistema, y un token que sólo lo traiga recibe `403 MISSING_ROLE`.
2. `bindActor` upserts a pseudonymous `actor` row keyed only by `sub` (`resolveActor`). No name/email/roles are ever stored.
3. `requireRoles(...)` gates by claim.
4. Handlers build a `DatabaseContext` via `requestContext(request)` and run mutations inside `withBusinessTransaction` ([prisma.ts](backend/src/infrastructure/database/prisma.ts)), which sets `app.actor_id`, `app.roles`, `app.request_id` with `set_config(..., true)` so SQL triggers can enforce/audit.
5. Any business mutation must write a `bitacora` entry **in the same transaction** via [auditoria/service.ts](backend/src/modules/auditoria/service.ts).

Public routes (`/api/v1/public`: hoy sólo la verificación de constancia por QR) skip auth but get rate limiting and bitácora with origin `PORTAL`.

### Database owns the hard rules

The database installs in **two steps**: `backend/prisma/migrations/` holds only the Prisma-generated structure, and `backend/prisma/migration_complementaria.sql` holds the hand-written SQL rules run **after** it — CHECK constraints, partial unique indexes (one active catalog/tarifa version), immutability triggers, append-only bitácora, and state-transition enforcement. `prisma migrate` alone does **not** install the complementary rules; run the complementary file separately, and never `prisma migrate reset` against a base initialized with `init_postgres_soapap3.sql` without re-granting (see [backend/README.md](backend/README.md)). Prisma does not express these — when changing the schema, keep the complementary SQL in sync. Published catalogs/tarifas are never edited; functional changes are new versions.

`backend/prisma/verificacion_integridad.sql` ejercita esas reglas en runtime contra una base real y termina en `ROLLBACK`. **Es la única forma de comprobarlas**: PostgreSQL no valida los nombres de columna del cuerpo de una función plpgsql al crearla, así que `migration_complementaria.sql` puede instalarse sin un solo error y aun así referirse a columnas que ya no existen. Al tocar la SQL complementaria, correrlo.

### Infrastructure adapters

`backend/src/infrastructure/`: `storage/` (NFS paths + hashes para evidencias/constancias/comprobantes — evidencias y comprobantes llegan Base64 dentro del JSON, de ahí el límite de body de 42mb; `leerPorUuid` sirve a los comprobantes, que se guardan por UUID sin columna `ruta`), `signing/` (cliente del Servicio de Firma — **sin uso**: el servicio quedó fuera del proyecto tentativamente, así que la emisión no firma y `firmaDigital`/`certificadoId` quedan en `null`; se conserva por si vuelve), `ouc/` (port only).

El comprobante de pago es **el ticket de la terminal bancaria** (única forma de pago en SOAPAP) o el comprobante de la transferencia: el ciudadano lo trae, ventanilla lo adjunta al cobrar. GSTS no emite ningún ticket ni acuse; el único documento que produce es el PDF de la constancia.

**La constancia es la excepción: el backend la genera, no la recibe.** `backend/src/modules/constancias/constancias/plantillas/` renderiza el PDF con PDFKit y estampa el QR de verificación. `documento.ts` tiene la maquetación común (membrete, identificación, firma, `C.c.p.`) y cada tipo aporta sólo su título y sus párrafos. Esos párrafos son **transcripción literal** de `documentacion/constancia_no-registro.txt` y `constancia_no-adeudo.txt`, a su vez transcritos del documento que SOAPAP emite hoy: no se parafrasean ni se «corrigen», y una prueba los compara palabra por palabra. El registro `PLANTILLAS` sigue siendo parcial a propósito, para que un tipo nuevo sin texto aprobado responda `409 TEMPLATE_NOT_CONFIGURED` en vez de inventar contenido. Los logotipos institucionales están en `backend/recursos/logotipos/`, fuera de `src/`, y se resuelven relativo al módulo: `dist/` espeja `src/`, así que la misma ruta sirve en dev y en producción sin pasos de build. La vigencia y el firmante impresos salen de `ConfiguracionConstancia` (una fila por tipo, sin valores por defecto).

## The API contract is the seam

Two artifacts define the backend⇄frontend boundary and must stay in sync:

- `@gsts/contracts` (`packages/contracts/src/index.ts`) — Zod schemas / DTOs used for API validation. Add request/response schemas there, not inline in routers.
- [openapi.ts](backend/src/api/openapi.ts) — documento OpenAPI escrito a mano que registra cada schema (vía `zodToJsonSchema`) y cada path; se sirve en `GET /api/v1/openapi.json`. Los pocos requests que un router valida con un schema local tienen aquí un *mirror* explícito.

`backend/tests/contract/openapi.test.ts` mantiene un inventario literal `[método, ruta]`: **agregar o renombrar una ruta rompe esa prueba hasta que se actualice `openapi.ts`**. El frontend consume ese documento con `npm run gen:api` → `frontend/src/api/schema.d.ts`, y todos sus tipos salen de ahí (`components['schemas']['Tramite']`), nunca se redeclaran a mano.

Convenciones de alambre: éxito `{ data, requestId? }`, listas `{ data, meta.nextCursor?, requestId? }` (paginación por cursor), error `{ error: { code, message, details? } }`. `meta` admite extras por ruta —`total` en `/tramites` y `/bitacora`, `porEstado` sólo en `/tramites`— que se declaran en el `envelopeLista` de esa ruta, nunca en el helper compartido: anunciarlos globalmente sería mentir en los listados que no los devuelven.

## Frontend architecture

- `src/features/<dominio>/` — cada feature tiene su `api.ts` con `queryOptions`/`infiniteQueryOptions` y hooks `useMutation` de TanStack Query; los componentes no llaman a `api` directamente.
- Estado: **TanStack Query para estado del servidor, Redux Toolkit sólo para estado de UI** (`src/store/`: notificaciones y preferencias). No duplicar datos del servidor en Redux.
- HTTP: [client.ts](frontend/src/api/client.ts) (`openapi-fetch` tipado con `paths`) inyecta el bearer token y convierte cualquier respuesta no-ok en `ApiError`; [errors.ts](frontend/src/api/errors.ts) traduce el `code` del contrato a copy es-MX (`copyDeError`) — al agregar un código de error en el backend, agregar aquí su copy.
- Auth: Keycloak Authorization Code + PKCE vía `oidc-client-ts`; el `userManager` ([oidc.ts](frontend/src/auth/oidc.ts)) se comparte entre React y el cliente HTTP. **Los roles se leen de `GET /auth/me`, nunca de los claims del token en la UI** ([useAuth.ts](frontend/src/auth/useAuth.ts)). Sesión vencida: `react-oidc-context` no escucha `AccessTokenExpired` y calcula `isAuthenticated` sólo al (re)cargar el usuario, así que un token vencido con la pestaña abierta dejaría la app creyéndose autenticada; [sesion.ts](frontend/src/auth/sesion.ts) es la señal —alimentada por los eventos de OIDC y por cualquier **401** del cliente HTTP, nunca por un 403— que levanta `SesionExpiradaDialog`. El login siempre viaja con `state.returnTo` para volver a la URL de origen: sin eso, todo deep link aterriza en la raíz.
- Navegación: [modulos.ts](frontend/src/app/layout/modulos.ts) es la fuente única de los módulos — el sidebar filtra por rol y la ruta índice redirige al primer módulo accesible en ese orden. Cada ruta se envuelve además en `<RequireRole>`. Las páginas se cargan con `lazy` (chunk por ruta, `<Suspense>` sobre el `<Outlet>` de `AppShell`): quien sólo usa Ventanilla no descarga Administración ni el wizard.
- Filtros de listado: los aplicados viven en el **query string** vía [useFiltrosUrl](frontend/src/shared/hooks/useFiltrosUrl.ts) —se comparten, sobreviven a un F5 y regresan tras reautenticarse—; lo que se teclea es estado local hasta pulsar «Buscar». El **índice de página no va en la URL**: la API pagina por cursor y no se puede abrir la página N en frío.
- Tema: [theme.ts](frontend/src/app/theme.ts) implementa el design system institucional SOAPAP (Institutional Flat System: vino/oro, Montserrat, sin sombras, variantes `standard`/`outstanding` en Paper y Card). Fuentes e iconos (Material Symbols vía `MsIcon`) son self-hosted, sin CDN.
- Iconos: la app **no** embebe la fuente completa de Material Symbols (4.9 MB, ~3 700 iconos) sino un subconjunto de ~5 kB con los que realmente usa. La lista es [iconos.ts](frontend/src/shared/components/iconos.ts) y `MsIcon` la exige por tipo, así que un icono fuera de ella es error de compilación, no un cuadro vacío en producción. Al agregar uno: añadirlo a `ICONOS` y correr `npm run gen:iconos` — regenera el `.woff2` y el mapa de codepoints, ambos versionados. `MsIcon` dibuja el **codepoint**, no el nombre como ligadura: subsetear por ligaduras es inviable porque los nombres son letras a–z y el cierre de ligaduras retendría casi toda la fuente.
- Imports con alias `@/` (configurado en `vite.config.ts` y `tsconfig.json`), **sin** extensión `.js` — a diferencia del backend.

## Conventions

- ESM (`"type": "module"`) with NodeNext resolution — intra-package imports en backend/contracts usan extensión `.js`.
- Strict TS with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Errors: throw `AppError(status, code, message)` from [shared/errors.ts](backend/src/shared/errors.ts); the central `errorHandler` normalizes responses.
- Logging (Pino): never log tokens, `sub`, RFC, names, or emails — the redact list in [app.ts](backend/src/app.ts) is a backstop, not permission. Log only `actor_id`, `request_id`, route, status, duration. `bitacora` nunca expone `ip_address`/`user_agent`: se excluyen en el `select` de Prisma, no sólo en el DTO.
- Code, comments, and API messages are in Spanish.

## Reference docs

En `documentacion2/` (estado destino tras la separación; **prevalecen** sobre `documentacion/` donde discrepen):

- `SISTEMA_GSTS.md` — qué queda de GSTS, con su ERD, máquinas de estado y plan de recorte.
- `SISTEMA_FINANZAS.md` — diseño del sistema de facturación independiente, aún no construido.
- `gsts_erd.html` / `finanzas_erd.html` — ERD interactivos con atributos, sin conexión.

En `documentacion/` (autoritativos para lo que no tocó el recorte):

- `CONTRATO_API_GSTS.md` — contrato de la API, máquinas de estado y catálogo de códigos de error.
- `PENDIENTES_BACKEND_FRONTEND.md` — backlog vivo de endpoints que el frontend necesita y el backend aún no expone.
- `GUIA_MODELO_SICNAF_Y_CATALOGOS.md` — modelo de datos y reglas de versionado de catálogos.
- `STACK_BACKEND_GSTS.md` / `STACK_FRONTEND_GSTS.md` — decisiones de stack, variables de entorno, criterios de aceptación.
- `GUIA_DESPLIEGUE_BASE_DATOS.md` e `init_postgres_soapap3.sql` — roles, aislamiento y permisos de PostgreSQL.
