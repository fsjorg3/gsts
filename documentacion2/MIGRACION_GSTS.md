# Migración SICEF → GSTS

> Inventario de lo que falta para que **internamente** todo el sistema sea GSTS.
> Lo que ya se hizo está en §0; lo demás **está documentado, no ejecutado**, porque
> rompe el entorno o depende de terceros (TI, infraestructura).

## Por qué

El sistema deja de ser «SICEF, el sistema de constancias» para convertirse en la plataforma de la
**Gerencia de Supervisión Técnica de los Servicios (GSTS)**, con Constancias como su primer dominio
y Atención Ciudadana (quejas ligadas a un trámite) como el siguiente. El nombre SICEF describe un
alcance que el sistema ya superó.

**El sistema no está en producción.** No hay datos reales que preservar ni constancias emitidas que
queden huérfanas, así que la ventana para hacer estos cambios es ahora: cada punto de abajo es
notablemente más barato hoy que después del primer despliegue.

---

## §0 · Ya hecho

| Cambio | Dónde |
|---|---|
| Prefijo del folio de constancia: `SICEF-` → `GSTS-` | `backend/src/modules/constancias/constancias/constancias.router.ts` |
| Marca visible de la interfaz (título de pestaña, sidebar, mensaje de rol faltante) | `frontend/index.html`, `AppShell.tsx`, `frontend/src/api/errors.ts` |
| Sidebar agrupado por dominio: sección «Constancias» | `frontend/src/app/layout/modulos.ts` (campo `seccion` + `seccionesDe`), `AppShell.tsx` |
| Módulos de dominio agrupados bajo `modules/constancias/` | `backend/src/modules/` (ver §7) |
| Identificadores de código (§3 completo): `SicefClaims`→`GstsClaims`, `resolveSicefClaims`→`resolveGstsClaims`, `RolSicef`→`RolGsts` | `modules/auth/claims.ts`, `middleware.ts`, `infrastructure/database/prisma.ts`, `useAuth.ts`, `modulos.ts`, `RequireRole.tsx` |
| Nombres de los 4 paquetes npm | `package.json` (raíz→`gsts`), `backend/package.json`→`@gsts/backend`, `frontend/package.json`→`@gsts/frontend`, `packages/contracts/package.json`→`@gsts/contracts` |
| 3 de 4 rutas NFS, y namespaceadas por dominio (no sólo `sicef`→`gsts`) | `backend/.env.example:14-16` → `/mnt/gsts/constancias/{evidencias,constancias,comprobantes}` |
| Cliente `gsts` creado y verificado en el realm SOAPAP: Client authentication OFF, Web origins `http://localhost:5173`, mapper de Audience con Included Client Audience `gsts` — login real completado end-to-end | Consola de administración de Keycloak (config externa, no versionada) |
| Versión de Prisma corregida: `prisma` (CLI) estaba en `^6.12.0` mientras `@prisma/client`/`@prisma/adapter-pg` ya estaban en `^7.0.0` — el mismatch impedía generar el cliente | `backend/package.json:42` |
| `@sicef/contracts` → `@gsts/contracts` cerrado del todo: 2 dependencias declaradas + 19 imports en backend (frontend nunca lo importaba, sólo tenía la dependencia declarada) | Ver §2 |

Verificado: `npm run check` y `npm run test` en verde en los 3 workspaces (backend 179/179, frontend
44/44), **ninguna ruta HTTP cambió** (inventario literal de `tests/contract/openapi.test.ts`, 59 rutas).

---

## §1 · Keycloak — hecho, verificado con login real

**El código ya no hardcodea nada**, y el cliente `gsts` ya existe y funciona en el realm SOAPAP.
`backend/.env` (y `.env.example`, y ambos `frontend/.env*`) apuntaban a `gsts` desde antes — el
código todavía exigía literalmente `sicef`, así que **el backend no arrancaba** con su propio `.env`.
Se corrigió:

| Qué | Antes | Ahora |
|---|---|---|
| `client_id` / `audience` | `backend/src/config/env.ts:21-22` con `z.literal('sicef')` | `z.string().min(1)` — toma lo que diga `.env` |
| Roles del token | `claims.ts` leía siempre `resource_access.sicef.roles`, fijo | `resolveGstsClaims(payload, clienteId)` recibe `env.KEYCLOAK_CLIENT_ID` desde `middleware.ts` y busca `resource_access[clienteId].roles` |

Había un segundo bug agazapado detrás del primero: aflojar sólo el schema habría dejado arrancar el
backend, pero **todo usuario habría caído en `403 MISSING_ROLE`** — Keycloak agrupa los roles de
cliente por `client_id` real (`resource_access.gsts.roles` para un token del cliente `gsts`), y el
código seguía buscando la llave `sicef`. Los dos se corrigieron juntos; `claims.test.ts` ahora
incluye un caso que prueba justo esto (roles bajo un `client_id` distinto al configurado deben
ignorarse).

**El cliente `gsts` se creó y se probó de punta a punta.** Tres bugs de configuración se encontraron
y corrigieron sobre la marcha, cada uno con un síntoma distinto en el navegador — se documentan
porque el próximo cliente Keycloak que se dé de alta (para Finanzas, o para `quejas`) va a pisar los
mismos tres si no se configuran desde el principio:

| Síntoma en el navegador | Causa | Fix en la consola de Keycloak |
|---|---|---|
| `Error: No matching state found in storage` justo después del login | No era Keycloak: `StrictMode` envolvía `AuthProvider` y React monta-desmonta-remonta sus efectos en dev, procesando el callback OIDC dos veces — el `state` en `sessionStorage` ya se había consumido en la primera pasada | (código) `frontend/src/main.tsx`: `AuthProvider` se sacó de dentro de `StrictMode` |
| `ErrorResponse: Invalid client or Invalid client credentials` | El cliente `gsts` tenía **Client authentication = ON** (confidencial); el flujo es SPA pública con PKCE, sin `client_secret` | Client authentication → **OFF** |
| CORS bloqueado: falta `Access-Control-Allow-Origin` en `/protocol/openid-connect/token` | **Web origins** del cliente no incluía `http://localhost:5173` (estaba como `http://localhost:5173/*`, que no calza igual) | Web origins → `http://localhost:5173` |
| `401` en `GET /auth/me` ya con token válido | El token no traía `gsts` en el claim `aud` — Keycloak no mete el `client_id` en `aud` por defecto, hace falta un *protocol mapper* explícito | Client scopes → `gsts-dedicated` → Add mapper → **Audience**, Included Client Audience = `gsts`, Add to access token = On |

Con los cuatro resueltos, el login completo (redirect → Keycloak → callback → `GET /auth/me` → app)
funciona de punta a punta contra el realm SOAPAP real.

Nota: el realm sigue siendo **SOAPAP** (la institución no cambia); sólo cambió el cliente.

---

## §2 · Paquetes npm del monorepo — hecho

**Los 4 campos `"name"` están en `@gsts/*`, y ahora también todas las referencias.** Lo que faltaba
(documentado abajo tal cual se encontró, para que quede el rastro) ya se cerró:

| Qué faltaba | Dónde | Cuántos |
|---|---|---|
| Dependencia declarada como `"@sicef/contracts"` | `backend/package.json`, `frontend/package.json` | 2 → renombradas a `@gsts/contracts` |
| `import ... from '@sicef/contracts'` | código fuente de backend (el inventario original decía 13; al cerrarlo eran **19** — creció con trabajo posterior, incluida `validaciones/no-registro.router.ts`) | 19 → todos a `@gsts/contracts` |

El frontend nunca tuvo ningún `import` real de este paquete (verificado con grep sobre todo
`frontend/src`) — sólo la dependencia declarada, ahora también renombrada por consistencia aunque
no se usa.

**Por qué parecía funcionar y no era confiable** (ya resuelto, se deja como registro): `npm run
check` corría en verde por un falso positivo del estado local — `node_modules/@sicef/contracts` era
un symlink viejo (del 21 de julio) que convivía con `node_modules/@gsts/contracts` (nuevo), ambos
apuntando a la misma carpeta, mientras `package-lock.json` seguía declarando la dependencia vieja. Un
`npm ci` limpio no lo habría recreado.

**Verificado tras cerrarlo**: cero ocurrencias de `@sicef/contracts` en todo el código fuente (sólo
quedan en `backend/dist/`, que es build output gitignorado y se regenera solo);
`node_modules/@sicef` ya no existe; `node_modules/@gsts/contracts` resuelve a `packages/contracts`.
`npm run check` y `npm run test` en los 3 workspaces — backend 179/179, frontend 44/44, contracts
en verde.

**Nuevo hallazgo, no estaba en el inventario original**: `packages/contracts/src/index.ts` exporta
tres identificadores con «Sicef» que mi inventario original se saltó por completo (sólo miró
`backend/src` y `frontend/src`, nunca `packages/contracts`):

| Identificador | Línea | Qué es |
|---|---|---|
| `RoleSicef` | `index.ts:10` | Tipo inferido de Zod |
| `rolesSicef` | `index.ts:8` | El arreglo de los 5 roles válidos |
| `roleSicefSchema` | `index.ts:9` | El `z.enum(rolesSicef)` |

Mismo patrón que `RolSicef` (§3) pero en otra capa. Consumidores conocidos:
`backend/src/modules/auth/claims.ts` (ver §1) y `backend/tests/unit/integracion-finanzas.test.ts`.

---
## §3 · Identificadores en el código — hecho

| Fue | Ahora | Archivos |
|---|---|---|
| `SicefClaims` | `GstsClaims` | `modules/auth/claims.ts`, `modules/auth/middleware.ts`, `infrastructure/database/prisma.ts` |
| `resolveSicefClaims` | `resolveGstsClaims` | `modules/auth/claims.ts`, `modules/auth/middleware.ts`, `tests/unit/claims.test.ts` |
| `RolSicef` | `RolGsts` | `frontend/src/auth/useAuth.ts`, `app/layout/modulos.ts`, `auth/RequireRole.tsx` |

Verificado con grep: cero ocurrencias de los tres nombres viejos en `backend/src` y `frontend/src`.
**Falta `RoleSicef`** (distinto, en `packages/contracts` — ver §2): mi inventario original no cubrió
ese paquete, así que no es que se haya saltado, es que no estaba listado.

**Hallazgo nuevo, documentado y no ejecutado**: "cero ocurrencias" arriba es sólo sobre esos tres
*identificadores* de código — el barrido nunca cubrió texto libre (prosa, logs, mensajes de error,
fixtures de test), y ahí sí persiste "sicef" literal:

| Dónde | Qué dice |
|---|---|
| `backend/src/server.ts` | log de arranque: `'SICEF API listening...'` |
| `backend/src/api/openapi.ts` | descripción de un KPI: "los seis KPIs que SICEF puede calcular…" |
| `backend/src/infrastructure/database/prisma.ts` | connection string de fallback con `sicef_app`/`sicef_db` (coherente con §4: el nombre real de la base sigue siendo ése) |
| `backend/src/infrastructure/signing/signing-client.ts` | `module: 'sicef'` |
| `backend/src/modules/auth/claims.ts` | mensaje de error: "…rol autorizado para SICEF" |
| `backend/src/modules/constancias/constancias/consulta.router.ts`, `plantillas/membrete.ts`, `direccion/direccion.router.ts` | comentarios sueltos |
| `frontend/src/auth/oidc.ts` | comentario: "cliente sicef" |
| `frontend/src/features/tramites/components/PasoEntrega.test.tsx`, `shared/descargarArchivo.test.ts` | fixtures con `folioUnico: 'SICEF-42-...'`, pese a que el prefijo real ya es `GSTS-` (§0) |

Igual que los fixtures NFS de §5: es texto de prosa/pruebas, no identificadores que rompan el
build ni comportamiento visible, así que no bloquea nada — se deja anotado para una pasada de
limpieza de texto libre.

---

## §4 · Base de datos — opcional, no necesario

| Actual | Destino |
|---|---|
| BD `sicef_db` | `gsts_db` |
| Rol `sicef_owner` (dueño, DDL vía Prisma) | `gsts_owner` |
| Rol `sicef_app` (runtime, sólo DML) | `gsts_app` |
| Rol `sicef_ro` (sólo lectura, reportes/BI) | `gsts_ro` |

Archivos: `documentacion/init_postgres_soapap3.sql` (secciones 1-4), `backend/.env.example:7-8`
(`DATABASE_URL`, `DIRECT_DATABASE_URL`).

**A diferencia del resto de este documento, esto es cosmético, no necesario.** Ningún nombre de
tabla, columna ni enum contiene «sicef» — el nombre de la BD es una etiqueta externa que sólo
aparece en dos URLs de conexión. Renombrarla no arregla nada por sí sola; el único argumento real a
favor aparece si `quejas` termina viviendo en la misma base y `sicef_db` empieza a ser engañoso —
y en ese momento, considerar **schemas de Postgres** (`constancias.*`, `quejas.*`,
`compartido.*` para `persona`/`actor`/`bitacora`) en vez de sólo renombrar la BD entera, para que la
separación sea real y no sólo de nombre.

Investigado: Prisma 7 soporta multi-schema como GA (sin flag de preview) y permite FK entre
schemas — pero el bloqueante real no es Prisma, es que `migration_complementaria.sql` usa nombres de
tabla y función **sin calificar** (`tramite`, `fn_tramite_transicion_valida`, etc.), que resuelven
hoy por el `search_path` por defecto (`public`). Mover tablas a otro schema exigiría calificar esas
~450 líneas de plpgsql a mano, o tocar `search_path` por rol — ninguna de las dos es gratis. Por eso
esto se queda documentado y no se ejecuta hasta que `quejas` sea un proyecto real, no una idea.

**Si sí se hace** (rename simple, sin schemas): aprovechar el reset ya planeado. El orden de
instalación no cambia: `prisma migrate deploy` → re-otorgar permisos (`init_postgres_soapap3.sql`
§3-4) → `migration_complementaria.sql` → `verificacion_integridad.sql`.

---

## §5 · NFS — 3 de 4, y con mejor forma que la propuesta original

`backend/.env.example:14-16` ya dice `/mnt/gsts/constancias/{evidencias,constancias,comprobantes}` —
mejor que mi propuesta original (`/mnt/gsts/...` a secas): namespacea por dominio, coherente con
`modules/constancias/` de §7. Si `quejas/` llega a necesitar NFS, sería
`/mnt/gsts/quejas/...` al lado, sin chocar.

**Corrección a una nota anterior de esta misma sección**: llegué a documentar aquí que
`NFS_BASE_PATH` "sigue en `/mnt/sicef`" — ya no es cierto, ninguno de los dos `.env` dice "sicef" en
esa variable (`backend/.env.example:13` dice `/mnt/gsts`; `backend/.env:13` real dice `/assets/gsts`,
ya sin la barra final que tenía antes). Lo que sigue siendo real: `NFS_BASE_PATH` no tiene el
segmento `/constancias/` que sí tienen sus tres vecinas en `.env.example`, y **nada en el código la
consume** más allá de la validación de arranque (`env.ts:23`, `z.string().min(1)`) — sigue siendo una
variable exigida pero muerta. Bajo riesgo; decidir entre alinearla a `/mnt/gsts/constancias` por
consistencia o quitarla del schema si de verdad no la usa nada sigue fuera del alcance de este
documento.

**Hallazgo nuevo, documentado y no ejecutado**: 3 archivos de test siguen hardcodeando fixtures con
`/tmp/sicef/...` para las 4 rutas NFS — `backend/tests/contract/openapi.test.ts`,
`backend/tests/http/security.test.ts`, `backend/tests/http/verificacion.test.ts`. Es código de
pruebas, no una ruta real, así que no afecta a producción ni bloquea nada; se deja anotado para
cuando se cierre el resto de §5.


---

## §6 · Documentación y repositorio — hecho, salvo el directorio del repo

- ~~`CLAUDE.md` describía el sistema como «SICEF: sistema para emitir constancias»~~ — reescrita la
  premisa (GSTS como plataforma, Constancias como primer dominio), `@sicef/contracts`→`@gsts/contracts`,
  cliente Keycloak, la ruta de `plantillas/` corregida a su nivel real de anidamiento, y agregada una
  frase explícita sobre la partición transversal/dominio de `modules/` que antes no estaba.
- ~~`documentacion/CONTRATO_API_SICEF.md` → `CONTRATO_API_GSTS.md`~~ — renombrado con `git mv`; las 3
  referencias en código real que lo mencionaban por nombre (`backend/src/api/openapi.ts` ×2, incluido
  el `title` servido en vivo en `/openapi.json`, y `frontend/src/api/errors.ts`) también se corrigieron.
- ~~`documentacion2/SISTEMA_SICEF.md` → `SISTEMA_GSTS.md`; `sicef_erd.html` → `gsts_erd.html`~~ — hecho,
  con `git mv`.
- ~~Los demás `.md` de `documentacion/` mencionan SICEF en prosa~~ — actualizados
  (`STACK_BACKEND_GSTS.md`, `STACK_FRONTEND_GSTS.md`, `GUIA_MODELO_SICNAF_Y_CATALOGOS.md`,
  `PENDIENTES_BACKEND_FRONTEND.md`, `GUIA_DESPLIEGUE_BASE_DATOS.md`, `init_postgres_soapap3.sql`). El
  título «SICNAF» de `GUIA_MODELO_SICNAF_Y_CATALOGOS.md` se dejó igual a propósito — parece un nombre
  de prototipo distinto de SICEF, fuera de este rebranding.
- ~~`documentacion2/SISTEMA_FINANZAS.md` describe el sistema hermano, que no cambia de nombre — pero
  sus referencias a «SICEF» como contraparte sí~~ — hecho, ~45 menciones actualizadas a GSTS; se dejó
  intacto el campo de esquema `verificableEnSicef`/`verificable_en_sicef` (nombre real, no de
  branding).
- **Pendiente, fuera de este documento**: el directorio de trabajo del repo (`proyectos/sicef` →
  `proyectos/gsts`) es una operación de filesystem fuera de git, con riesgo de romper cualquier sesión
  activa sobre el repo — queda como acción manual, no automatizable desde aquí.

---

## §7 · Estructura de módulos (hecho, con nota pendiente)

```
backend/src/modules/
  auth/  auditoria/  actores/  sistema/  personas/  bitacora/   ← transversales GSTS
  constancias/                                                   ← dominio
    administracion/  catalogos/  cobros/  constancias/  direccion/
    evidencias/  motivos-reduccion/  publico/  tramites/  validaciones/
```

**El criterio**: arriba queda lo que un dominio futuro (p. ej. `quejas/`) necesitará igual —
autenticación, bitácora, identidad del actor, health checks, el padrón de personas (un quejoso
también es una persona) y el visor de auditoría global. Abajo, lo que sólo tiene sentido para
constancias. Si `quejas/` tuviera que importar de `modules/constancias/auth/`, la frontera estaría
mal trazada.

`direccion/` bajó a `constancias/` porque hoy sólo calcula indicadores de constancias. Cuando
agregue métricas de otros dominios, subirá.

**Pendiente menor**: `modules/constancias/constancias/` tiene el nombre repetido (dominio → módulo de
emisión). Renombrar el interno a `emision/` lo aclararía; se dejó como está para no mezclar un
renombre semántico con el movimiento de carpetas. Toca ~10 imports (`router.ts` y dos tests).

**Nota para quien mueva módulos en el futuro**: los logotipos del PDF se resuelven **relativo al
módulo** con `new URL(..., import.meta.url)` en `constancias/constancias/plantillas/membrete.ts` —
no es un `import`, así que ninguna herramienta de refactor lo ajusta. Mover ese archivo de nivel
exige contar los `../` a mano; el síntoma es un `ENOENT` de `soapap.png` al generar el PDF.

---

## Orden sugerido — actualizado con el avance real

1. ~~§3 identificadores~~ — **hecho**.
2. ~~§2 paquetes npm~~ — **hecho** (19 imports + 2 dependencias + `npm install`, 179+44 pruebas en verde).
3. ~~§1 Keycloak~~ — **hecho**: cliente `gsts` creado, configurado y verificado con login real de
   punta a punta (ver §1 para los 4 bugs de configuración que se resolvieron en el camino).
4. ~~§5, el detalle de `NFS_BASE_PATH`~~ — **cerrado en documentación**: ya no dice "sicef" en ningún
   lado; queda como hallazgo abierto (no de branding) que sigue sin consumirse en código, y el
   hallazgo nuevo de los 3 fixtures de test con `/tmp/sicef/...`.
5. ~~§6 documentación~~ — **hecho**: `documentacion/` y `documentacion2/` actualizadas, 5 archivos
   renombrados (`CONTRATO_API_GSTS.md`, `STACK_BACKEND_GSTS.md`, `STACK_FRONTEND_GSTS.md`,
   `SISTEMA_GSTS.md`, `gsts_erd.html`), `CLAUDE.md` actualizado.
6. **`RoleSicef`/`rolesSicef`/`roleSicefSchema`** en `packages/contracts` (hallazgo de §2, sin cerrar
   todavía) — mismo patrón que el resto de §3, en otra capa. Es lo único de código que sigue abierto.
7. **§4 base de datos** — junto con el reset ya planeado. Sigue siendo el más opcional de todos.

## Lo que NO cambia

- El realm de Keycloak: **SOAPAP**.
- El tema visual y la marca institucional SOAPAP (`frontend/src/app/theme.ts` no contiene «SICEF»).
- El esquema de la base: ninguna tabla, columna o enum lleva el nombre del sistema.
- Las rutas de la API (`/api/v1/...`) y las tres rutas de sólo lectura que consume Finanzas.
- El sistema Finanzas, que es un repositorio aparte.
