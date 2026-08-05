# Pendientes backend ⇄ frontend

Backlog de endpoints y capacidades que el frontend (SICNAF) necesita y el backend aún no expone.
Complemento de trabajo de `CONTRATO_API_SICEF.md`; se actualiza al cierre de cada fase del frontend.

Estado a **24 jul 2026**. Prioridad: 🔴 bloquea un módulo · 🟡 degrada la experiencia · 🟢 mejora futura.

## Resueltos durante la fase 1 del frontend

Estas brechas se detectaron al construir Ventanilla y se resolvieron con endpoints mínimos (ya en `openapi.json` y con pruebas de contrato):

| Endpoint agregado | Motivo |
|---|---|
| `POST /personas` · `GET /personas?search=` | `POST /tramites` exige `personas[].personaId` pre-existente y no había forma de crear/buscar personas. |
| `PATCH /tramites/{id}/evidencias/{evidenciaId}` | Las evidencias nacían `CARGADO` y el trigger de `CAPTURA → EN_VALIDACION` exige `VALIDADO`; no existía transición. |
| `GET /catalogos/tarifas/activas?tipo=` | El cobro requiere `tarifaId` y no había ningún GET de tarifas. |
| `GET /catalogos/requisitos/{id}/vista-previa` reubicado antes del gate `ti` | Ventanilla necesita el árbol del catálogo **estampado** en el trámite; la ruta exigía rol `ti`. |
| `GET /catalogos/requisitos?take=&cursor=` (rol `ti`) | Sin listar todas las versiones (publicadas o no), TI no podía ver ni retomar un borrador abandonado; el cálculo "versión = activa+1" chocaba con el `UNIQUE` de `version` al reintentar crear. |
| `GET /administracion/plazos` (rol `ti`) | Sólo existía `PUT`; el formulario de Administración mostraba siempre sus valores por defecto (`3`/`30`) en vez de la configuración real, y "guardaba a ciegas". |
| Fix: `bitacora.entidad_id` vs `ConfiguracionPlazos.id` | `ConfiguracionPlazos` es un singleton con id de texto fijo (`'PLAZOS_OPERATIVOS'`), no UUID como el resto de entidades; auditar con `plazos.id` fallaba contra la columna `bitacora.entidad_id` (UUID estricto) y hacía rollback de todo el `PUT /administracion/plazos`. Se audita ahora con un UUID fijo bien conocido (`00000000-0000-0000-0000-000000000001`) para esa fila singleton. |
| `GET /bitacora?entidad=&entidadId=&accion=&actorId=&desde=&hasta=&take=&cursor=` (rol `ti`) | Visor de auditoría global (módulo "Bitácora" del sidebar): la tabla `bitacora` era sólo-escritura. Restringido a `ti`; el `select` de Prisma excluye `ip_address`/`user_agent` a propósito, no sólo el DTO — nunca deben salir de la consulta. **No reemplaza** el pendiente 🟡 de abajo ("Bitácora del trámite"): ese caso es para `ventanilla` acotado a un solo trámite, éste es de auditoría global para `ti`. |
| Comprobante de pago adjuntable en `POST /tramites/{id}/cobros` y borradores de cobro | No había forma de adjuntar el voucher real (foto/PDF de transferencia, ficha de depósito) — solo `referenciaPago` (texto libre). Nuevo scope NFS `comprobantes` + 5 columnas en `borrador_cobro` y `cobro` (mismo patrón que `Evidencia`: `archivoUuid`, `nombreOriginal`, `hashSha256`, `mimeType`, `tamanoBytes`), opcional, sin `CHECK`. Se sube al guardar el borrador (o cobrar directo); `/aplicar` solo copia la referencia ya guardada, sin tocar NFS de nuevo ni cambiar su contrato (sigue sin body). |
| Verificación pública por QR: `GET /public/constancias/{folio}/verificar/{token}` **reemplaza** a `GET /public/constancias/{folio}` | La ruta anterior consultaba por folio sin ningún secreto, y el folio (`SICEF-{numeroTramite}-{8 hex}`) lleva el consecutivo del trámite: cualquiera podía barrer el padrón de constancias. Ahora hace falta el token HMAC impreso en el QR. Token inválido y folio inexistente devuelven un 404 **idéntico**, para que no se pueda distinguir un folio existente de uno inventado. Dos columnas nuevas en `constancia`: `hash_contenido` (SHA-256 de los datos estructurados, no de los bytes del PDF — ancla de integridad del registro) y `version_token` (versión de la clave HMAC, para rotar sin invalidar lo emitido). Ambas se agregaron a `fn_constancia_inmutable`. El QR lo dibuja el frontend a partir de `constancia.urlVerificacion` (campo derivado, no columna): el backend no genera el PDF, ventanilla lo sube ya hecho. La respuesta expone folio, tipo, estado, vigencia, **nombre del titular** y —sólo en No Registro— el domicilio del predio, para que quien escanea confirme que la constancia es suya; nunca RFC, identificadores internos ni personas distintas del titular. Sigue disponible como endurecimiento el patrón de `GET /public/facturas/{folio}`: exigir `?rfc=` para que una URL filtrada no baste. |
| `GET /tramites/{id}/constancias/{constanciaId}/archivo` (rol `ventanilla`) | Al generar el backend el PDF, ventanilla dejó de tener el archivo: antes lo subía y conservaba copia. Sin este endpoint no había forma de obtener el documento desde la aplicación, que es justo lo que ventanilla entrega impreso. Devuelve el binario (única excepción a la envolvente `{ data }`), acotado al `tramiteId` de la ruta para que no se pueda descargar la constancia de otro trámite. En la pantalla de Entrega aparecen los botones **Imprimir** y **Descargar PDF**. |
| Generación del PDF de la constancia (**sólo No Registro**) + `GET`/`PUT /administracion/constancias/{tipo}` | `POST /tramites/{id}/constancias` recibía un PDF que ventanilla armaba por fuera (`pdfBase64`), y por eso el QR de verificación no podía ir impreso: la URL depende de un folio que aún no existía. Ahora el backend genera el documento con PDFKit desde una plantilla por tipo, con el QR estampado. El texto legal de No Registro sale verbatim de `constancia_no-registro.txt` y una prueba lo compara palabra por palabra (extrayendo el texto del PDF con `pdftotext`) para que nadie lo reformule sin querer. La vigencia y el firmante viven en la nueva tabla `ConfiguracionConstancia` (una fila por tipo, sin default: sin configurar no se emite). |
| Domicilio del predio en trámites de No Registro (`crearTramiteSchema`, `GET /tramites/{id}`) | No existía ningún campo de domicilio en el modelo, ni siquiera análogo al `nis` de No Adeudo, pese a ser indispensable porque va impreso en la constancia. 5 columnas nuevas en `tramite` (`domicilioCalle`, `domicilioNumero`, `domicilioColonia`, `domicilioPerteneceA` enum `JUNTA_AUXILIAR`\|`MUNICIPIO`, `domicilioPerteneceANombre` texto libre), opcionales, sin `CHECK` (mismo nivel de laxitud que `nis`). Sin catálogo de juntas auxiliares/municipios a propósito: la zona de cobertura abarca Puebla + 4 municipios más y se captura todo en mayúsculas desde el frontend. |

## Pendientes

### Finanzas (módulo actualmente en shell con datos de demostración)

| Prioridad | Necesidad | Endpoint propuesto | Notas |
|---|---|---|---|
| 🔴 | Bandeja de solicitudes públicas de factura | `GET /facturas/solicitudes?estado=&take=&cursor=` (rol `finanzas`) | DTO existente `solicitudFacturaDto`; filtro por `PENDIENTE_REVISION` por defecto. Sin esto, `aceptar/rechazar` (ya implementados en UI) no tienen de dónde alimentarse. |
| 🔴 | Monitoreo de facturas | `GET /facturas?estado=&take=&cursor=` (rol `finanzas`) | DTO `facturaDto`. Filtros por estado de timbrado (`PENDIENTE`, `TIMBRADO_FALLIDO`, …). La pantalla del prototipo (tabs + detalle con `ultimoError`) ya está maquetada. |
| 🟡 | Reintento de timbrado | `POST /facturas/{id}/reintentar` | Depende del worker PAC (fuera de alcance). Sólo tiene sentido cuando exista `TIMBRADO_FALLIDO` real. |
| 🟢 | Factura global de público en general | por definir | El prototipo la muestra como tab; requiere definición de negocio (consolidación por periodo). |

### Dirección (módulo actualmente en shell con datos de demostración)

| Prioridad | Necesidad | Endpoint propuesto | Notas |
|---|---|---|---|
| 🔴 | Indicadores del tablero | `GET /direccion/metricas?periodo=` (rol `direccion`) | Constancias emitidas por mes (por tipo), trámites por estado, tasa de éxito de timbrado, % vencidos sin pago, % con reducción, consultas a concesionaria, revalidaciones fallidas. Estrategia sugerida: agregación SQL directa primero; vistas materializadas si el volumen lo pide. Nota: `direccion` hoy es "rol reservado; ningún endpoint lo exige" — este sería el primero. |

### Transversales

| Prioridad | Necesidad | Endpoint propuesto | Notas |
|---|---|---|---|
| 🔴 | Página del portal que atiende la URL del QR | (portal ciudadano, fuera de `frontend/`) | El QR ya codifica `PUBLIC_BASE_URL/constancias/{folio}/verificar/{token}`, pensada para que la escanee una persona. Hoy **nada sirve esa ruta**: el endpoint real es `GET /api/v1/public/constancias/{folio}/verificar/{token}` y devuelve JSON. Falta la página del portal que consuma ese endpoint y muestre el resultado legible (o, como paliativo, apuntar `PUBLIC_BASE_URL` al prefijo de la API y aceptar que el ciudadano vea JSON). `frontend/` es la app interna, no el portal. |
| 🔴 | **Plantilla de constancia de No Adeudo** | (ninguno; es contenido, no endpoint) | El motor de plantillas ya está: falta **el texto legal aprobado**. Mientras no exista, `PLANTILLAS['NO_ADEUDO']` queda sin registrar y emitir ese tipo responde `409 TEMPLATE_NOT_CONFIGURED` — deliberado, para no producir un documento oficial con texto inventado. Agregarlo es escribir `plantillas/no-adeudo.ts` y añadir una línea al registro; según lo definido, ese tipo sí lleva nombre del titular y su cuenta NIS (No Registro no lleva destinatario: se emite al portador porque el predio no tiene cuenta). |
| 🔴 | Descarga de archivos **de evidencias y CFDI** (la constancia ya se resolvió) | `GET /tramites/{id}/evidencias/{evidenciaId}/archivo`, `GET /public/facturas/{folio}/archivos/{tipo}` | Los archivos viven en NFS y la API sólo guarda ruta/hash. La ruta pública de CFDI ya devuelve `archivoUuid` sin forma de descargarlo. El patrón a seguir ya existe: `NfsStorage.leer()` + el endpoint de constancia; el frontend puede reusar `shared/descargarArchivo.ts`. Ojo con la ruta pública de CFDI: no lleva token de sesión, así que necesita su propia guarda (folio + RFC, como el resto de `/public`). |
| 🟡 | Bitácora del trámite | `GET /tramites/{id}/bitacora?take=&cursor=` (rol `ventanilla`) | El panel lateral del wizard del prototipo muestra la línea de tiempo auditada; sigue sin implementarse. Distinto del `GET /bitacora` global ya resuelto arriba (ese es sólo `ti`): éste necesita rol `ventanilla` y acotarse siempre al `entidadId` del trámite abierto. Puede reusar el mismo `select` sin `ip_address`/`user_agent` del router de bitácora. |
| 🟡 | Confirmaciones manuales | `POST /tramites/{id}/confirmaciones` (`tipoConfirmacionSchema`: `SIN_ADEUDO_OUC`, `FIRMAS_LEGIBLES`, `FACULTADES_PODER`) | El DTO y la tabla existen (`confirmacionManualDto`, aparece en el detalle) pero no hay endpoint de escritura. El paso Validación del prototipo las captura como checkboxes. |
| 🟡 | Datos fiscales del receptor en ventanilla | Extender `CobroRequest` con receptor opcional (`rfc`, `nombre`, `cp`, `regimen`, `usoCfdi`) | El prototipo captura el receptor al cobrar; hoy la factura nace `PENDIENTE` sin receptor y los datos sólo llegan por la solicitud del portal público. |
| 🟡 | Detalle de trámite con factura | Incluir `cobro.factura` en `GET /tramites/{id}` | El paso Entrega no puede saber si el CFDI ya se timbró; "Finalizar" se intenta y se traduce el 409. |
| 🟢 | Métricas de ventanilla | `GET /ventanilla/metricas` | Las KPI cards de la lista hoy se derivan sólo de la página cargada (25 trámites). |

### Fuera de alcance de este monorepo (referencia)

- **Worker PAC** (`backend/src/infrastructure/pac/port.ts`): timbrado real, `PENDIENTE → TIMBRADO_EN_PROCESO → TIMBRADO/TIMBRADO_FALLIDO`, generación de XML/PDF. Hasta entonces, toda factura permanece `PENDIENTE` y la UI lo comunica como "en espera del timbrado externo".
- **Integración OUC** (`backend/src/infrastructure/ouc/port.ts`): consulta automática de no adeudo. La UI captura las validaciones con `metodo=MANUAL`.
- ~~**Servicio de Firma**: la emisión de constancias falla si no está disponible.~~ **Retirado del flujo (tentativamente)**: no habrá Servicio de Firma en este proyecto, así que la emisión ya no lo invoca y `firmaDigital`/`certificadoId` nacen en `null`. El cliente HTTP se conserva sin uso en `backend/src/infrastructure/signing/`. Si el servicio se reincorpora, hay que decidir qué hacer con las constancias ya emitidas: `trg_constancia_inmutable` impide firmarlas retroactivamente.
- ~~**Generación del PDF de la constancia**: hoy es un insumo que ventanilla adjunta manualmente al emitir; la generación automática (plantilla + QR estampado) queda para una fase posterior.~~ **Resuelto para No Registro** (ver tabla de resueltos): el backend genera el PDF con PDFKit y el QR va estampado en el documento. El QR de la pantalla de Entrega se conserva como vista previa dentro de la app. Sigue pendiente 🔴 la plantilla de **No Adeudo**, a la espera de su texto legal.

## Notas de implementación para quien tome estos pendientes

- Seguir el patrón de módulo existente (`backend/src/modules/personas/` es el ejemplo más pequeño): router + Zod de `@sicef/contracts` + `withBusinessTransaction` + `auditarUsuario` + registro en `backend/src/api/openapi.ts` + alta en `tests/contract/openapi.test.ts` (`OPERACIONES_ESPERADAS`).
- Tras cualquier cambio de contrato: `npm run gen:api -w frontend` regenera `frontend/src/api/schema.d.ts`.
- Los shells de Finanzas y Dirección consumen fixtures de `frontend/src/mocks/`; al existir los endpoints reales, sustituir el import del mock por hooks de React Query (los de facturación ya existen en `frontend/src/features/facturacion/api.ts`).
