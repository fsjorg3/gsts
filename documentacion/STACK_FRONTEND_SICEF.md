# Stack frontend para el monorepo SICEF

## 1. Propósito y alcance

Este documento describe el frontend implementado en `frontend/`, complemento de `STACK_BACKEND_SICEF.md`. Es una SPA que consume exclusivamente la API del backend (`/api/v1`, contrato OpenAPI) y nunca accede directo a PostgreSQL, NFS, administración de Keycloak ni al Servicio de Firma — coincide con el límite ya declarado en el documento del backend.

Recrea el prototipo institucional (`documentacion/SOAPAP constancias system files/`) con MUI 9.2.0 sobre el design system institucional vino/oro. Alcance actual:

- **Ventanilla**: completo y funcional contra la API real (Captura → Validación → Aprobación → Cobro y emisión → Entrega).
- **Administración** (rol `ti`): catálogo de requisitos (versionado, clonación, publicación), tarifas, motivos de reducción y plazos operativos — el mínimo indispensable para operar Ventanilla en un entorno vacío.
- **Bitácora** (rol `ti`): visor de auditoría global de solo lectura sobre la tabla `bitacora`.
- **Finanzas y Dirección**: *shells* con datos de demostración; el backend aún no expone sus endpoints de listado/métricas (ver `documentacion/PENDIENTES_BACKEND_FRONTEND.md`).
- **Portal público** (verificación de constancia, descarga de CFDI): fuera de alcance de esta fase.

## 2. Stack implementado

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Build / dev server | Vite 8.1.5 | Dev server con proxy a `/api/v1`, build de producción. |
| Lenguaje | TypeScript 5.8 estricto + npm workspaces | `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, alias `@/ → src/`. |
| UI | React 19 + MUI 9.2.0 (`@mui/material`, `@mui/icons-material`) | Componentes, Grid v2, tema institucional sin `sx` de sistema legado. |
| Gráficas | `@mui/x-charts` 9.10.0 | Gráfica de barras del tablero de Dirección. |
| Enrutamiento | `react-router` 8.3.0 (data router) | `createBrowserRouter`, guards por rol, redirect de índice según rol real. |
| Server state | TanStack Query 5.101.4 (API declarativa) | `queryOptions` / `infiniteQueryOptions` por *feature*; nunca `fetch` crudo. |
| Client state | Redux Toolkit + `react-redux` | Sólo UI efímera: módulo/sidebar activo y cola de notificaciones. |
| Cliente HTTP | `openapi-fetch` + `openapi-typescript` | `schema.d.ts` generado desde el OpenAPI real del backend (`npm run gen:api`). |
| Contratos compartidos | `@sicef/contracts` (workspace) | Mismos esquemas Zod que valida el backend, reusados donde aplica en el cliente. |
| Autenticación | `react-oidc-context` + `oidc-client-ts` | Keycloak realm `SOAPAP`, cliente público `sicef`, Authorization Code + PKCE. |
| Tipografía / iconografía | `@fontsource/montserrat`, `material-symbols` | Self-host, sin dependencia de CDN (regla del design system). |
| Pruebas | Vitest + Testing Library + `jsdom` | Unitarias de lógica de UI (no hay E2E contra Keycloak real). |

**Instaladas pero sin uso activo en el código actual** (quedaron del scaffolding inicial; usarlas o retirarlas es una decisión pendiente, no un bug):
- `react-hook-form` / `@hookform/resolvers`: los formularios existentes (Administración, paso de Cobro, alta de persona) se resolvieron con `useState` controlado directo sobre `TextField`, más simple para su tamaño actual.
- `msw`: `mocks/finanzas.ts` y `mocks/direccion.ts` son arreglos estáticos importados directamente por las páginas de Finanzas/Dirección, no un *service worker* interceptando peticiones reales.

## 3. Arquitectura del frontend

SPA de un único layout raíz. `AppShell` monta un sidebar de módulos y un `<Outlet />` para la ruta activa; el resto del árbol vive bajo `features/<dominio>/` (páginas, componentes y su propio `api.ts` con las queries/mutaciones tipadas de ese dominio).

### Autenticación y roles

- `AuthGate` exige sesión en toda la app interna: si no hay usuario autenticado, redirige a Keycloak (`signinRedirect`).
- El frontend **no decodifica el JWT ni interpreta claims por su cuenta** — `useAuth` llama `GET /auth/me` y usa exactamente los roles que el backend ya resolvió (`ventanilla`/`finanzas` desde `resource_access.sicef.roles`, `ti`/`direccion` desde `realm_access.roles`). Evita duplicar en el cliente una lógica de extracción de roles que ya es responsabilidad del backend.
- `RequireRole` guarda cada ruta interna (defensa en profundidad); `AppShell` y el redirect de la ruta índice (`IndexRedirect`) filtran/enrutan usando la misma tabla módulo→rol (`app/layout/modulos.ts`) — un usuario nunca ve ni es enviado a un módulo para el que no tiene rol.
- PKCE exige contexto seguro (HTTPS o `localhost`); acceder por IP de LAN sin HTTPS rompe `crypto.subtle`.

### Server state (TanStack Query)

Cada `features/<dominio>/api.ts` expone `queryOptions`/`infiniteQueryOptions`/`useMutation` tipados contra `api/schema.d.ts`. Paginación por cursor en listados largos (trámites, personas, bitácora), igual que el contrato del backend. El estado de negocio (trámites, catálogos, cobros) nunca se duplica en Redux: React Query es la única fuente de verdad para datos del servidor.

### Client state (Redux Toolkit)

Sólo dos *slices*, ambos de UI efímera:
- `ui`: módulo/sidebar activo.
- `notifications`: cola de snackbars, consumida por `Notifier` (global) y despachada vía `useNotificar`/`copyDeError` cuando una mutación falla.

### Errores

`ApiError` (`api/errors.ts`) normaliza el envelope `{ error: { code, message, details } }` del contrato y traduce cada código del catálogo (`documentacion/CONTRATO_API_SICEF.md` §7) a un copy es-MX accionable; los códigos no listados caen al `message` del backend.

### Diseño

`app/theme.ts` es la única fuente de tokens: paleta institucional vino (`#3D0017`) / oro (`#B8822A`), tipografía Montserrat, `shadows` todas `'none'`, variantes `standard`/`outstanding` de `Paper`/`Card` (franja izquierda de color), AppBar flotante con `backdropFilter`. `shared/components` encapsula los patrones repetidos (`DataTable`, `EstadoBadge`, `StatCard`, `MsIcon`) para que las *features* no reinventen estilo.

### Trámites (Ventanilla)

El *wizard* deriva el paso activo del **estado real del trámite devuelto por el servidor**, nunca de estado local — un componente por paso (`PasoValidacion`, `PasoAprobacion`, `PasoCobro`, `PasoEntrega`) y toda transición de estado se pide a la API; el cliente nunca asume el siguiente estado. Las mutaciones de cobro generan una `idempotency-key` por intento (`nuevaIdempotencyKey()`), como exige el contrato.

### Finanzas / Dirección

*Shells* que hoy consumen fixtures estáticos (`mocks/`) marcados en UI como datos de demostración, porque el backend aún no expone los endpoints de listado/métricas correspondientes. Las mutaciones ya disponibles en el backend (aceptar/rechazar solicitud de factura) están conectadas de verdad; el resto queda documentado en `documentacion/PENDIENTES_BACKEND_FRONTEND.md`.

## 4. Árbol de directorios

```text
frontend/
├─ src/
│  ├─ api/
│  │  ├─ client.ts              # openapi-fetch + middleware de auth y errores
│  │  ├─ schema.d.ts             # generado (npm run gen:api), no editar a mano
│  │  ├─ errors.ts               # ApiError + catálogo de copys es-MX
│  │  └─ serializers.ts          # formatMxn, formatFecha/Hora, formatBytes
│  ├─ app/
│  │  ├─ layout/
│  │  │  ├─ AppShell.tsx          # sidebar filtrado por rol + área de módulo
│  │  │  ├─ NavItem.tsx
│  │  │  ├─ ModuleHeader.tsx
│  │  │  ├─ Notifier.tsx          # Snackbar global
│  │  │  └─ modulos.ts            # tabla módulo → roles (fuente única)
│  │  ├─ router.tsx               # rutas, RequireRole por ruta, IndexRedirect
│  │  ├─ store.ts                 # Redux Toolkit (ui, notifications)
│  │  └─ theme.ts                 # tema institucional MUI
│  ├─ auth/
│  │  ├─ oidc.ts                  # UserManager (Keycloak, Authorization Code + PKCE)
│  │  ├─ useAuth.ts                # roles reales vía GET /auth/me
│  │  ├─ RequireRole.tsx
│  │  └─ AuthGate.tsx              # exige sesión en toda la app interna
│  ├─ features/
│  │  ├─ tramites/                # Ventanilla: lista, wizard, pasos del expediente
│  │  ├─ personas/                # alta y búsqueda de solicitantes
│  │  ├─ evidencias/              # checklist de requisitos y carga Base64
│  │  ├─ validaciones/            # no adeudo (OUC manual)
│  │  ├─ cobros/                  # borradores y cobro definitivo
│  │  ├─ motivos-reduccion/       # catálogo de motivos de reducción (rol ti)
│  │  ├─ constancias/             # emisión de constancia
│  │  ├─ catalogos/               # requisitos y tarifas
│  │  ├─ administracion/          # asistente de catálogo/tarifas/reducciones/plazos (rol ti)
│  │  ├─ bitacora/                # visor de auditoría global (rol ti)
│  │  ├─ facturacion/             # Finanzas (shell + datos de demostración)
│  │  └─ direccion/               # Dirección (shell + datos de demostración)
│  ├─ mocks/                      # fixtures de demostración (Finanzas, Dirección)
│  ├─ shared/components/          # DataTable, EstadoBadge, StatCard, MsIcon
│  ├─ store/                      # slices de Redux Toolkit + hooks tipados + useNotificar
│  ├─ main.tsx                    # Provider→QueryClientProvider→AuthProvider→ThemeProvider→AuthGate→RouterProvider
│  └─ vite-env.d.ts
├─ vite.config.ts                 # puerto 5173, proxy /api/v1 → backend, host:true (acceso LAN)
├─ vitest.setup.ts
├─ .env                           # local; nunca se versiona
├─ .env.example                   # plantilla sin secretos
└─ package.json
```

Cada *feature* sigue el mismo patrón interno: `api.ts` (queries/mutaciones tipadas) + `pages/` (o componentes de nivel superior) +, si aplica, subcomponentes de UI propios del dominio.

## 5. Variables de entorno del frontend

Vite sólo expone variables con prefijo `VITE_`. Crear `frontend/.env` por entorno; `.env.example` es la plantilla versionada.

```env
VITE_API_BASE_URL=/api/v1
VITE_KEYCLOAK_AUTHORITY=https://<KEYCLOAK_HOST>/realms/SOAPAP
VITE_KEYCLOAK_CLIENT_ID=sicef
```

En desarrollo, `vite.config.ts` sirve `/api/v1` mediante proxy hacia `http://127.0.0.1:3000`, así que el navegador nunca hace la petición cross-origin directamente y `CORS_ORIGINS` del backend no necesita más que el origen de Vite. `host: true` permite abrir la app desde una IP de LAN además de `localhost` — importante recordar que **PKCE exige contexto seguro**, así que el login sólo funciona vía `localhost` o HTTPS, no por IP plana.

## 6. Pruebas mínimas

- **Unitarias**: derivación del paso del *wizard* según el estado del trámite (`derivarPaso.test.ts`), checklist de requisitos (`checklist.test.ts`), serializers de montos/fechas (`serializers.test.ts`), mapeo de códigos de error a copy (`errors.test.ts`).
- **Tipos**: `tsc --noEmit` estricto — cualquier *drift* entre `schema.d.ts` y el uso real del cliente es un error de compilación, no un bug de runtime.
- **Contrato**: `npm run gen:api` regenera `schema.d.ts` desde el OpenAPI servido por el backend; se vuelve a correr tras cualquier cambio de contrato en `@sicef/contracts`.
- **No automatizado todavía**: no hay pruebas end-to-end contra un Keycloak real (requiere sesión interactiva); la verificación de flujos completos por rol se hace manualmente.

## 7. Criterios de aceptación / estado actual

1. El frontend nunca decide reglas de negocio: cada transición de estado, cálculo de monto (`montoFinal`, reducciones) y validación de integridad se resuelve en el backend; el cliente sólo refleja el resultado devuelto.
2. Ningún módulo del sidebar ni su ruta son visibles/alcanzables sin el rol real devuelto por `GET /auth/me`.
3. Ventanilla opera de punta a punta contra la API real; Administración cubre lo mínimo para poder operar Ventanilla en un entorno recién instalado (sin seed de catálogos).
4. Finanzas y Dirección permanecen en *shell* con datos de demostración hasta que existan sus endpoints reales (`documentacion/PENDIENTES_BACKEND_FRONTEND.md`); la UI lo comunica explícitamente, nunca se presenta como dato real.
5. `npm run check`, `npm run build` y `npm run test` deben pasar en los tres *workspaces* (`backend`, `packages/contracts`, `frontend`) antes de dar por cerrado un cambio.
