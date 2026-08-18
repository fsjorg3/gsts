# Guía del modelo de datos SICNAF y creación ordenada de catálogos

## 1. Propósito

Este documento explica el modelo definido en `backend/prisma/schema.prisma` y las reglas de integridad incluidas en `backend/prisma/migrations/0001_init/migration.sql`.

El modelo representa el ciclo completo de una constancia de no adeudo o de no registro:

1. un usuario captura un trámite;
2. se adjuntan evidencias conforme a un catálogo de requisitos;
3. se valida la situación del solicitante;
4. se aprueba o rechaza el trámite;
5. se genera y registra el cobro;
6. se emite la constancia;
8. se finaliza el trámite y se conserva la bitácora de todo lo ocurrido.

La regla de diseño más importante es que la base de datos no sólo almacena datos: también protege la historia. Un catálogo o una tarifa que ya fue publicada no debe modificarse para cambiar su significado. Los cambios funcionales se modelan como nuevas versiones.

## 2. Responsabilidad de cada archivo

### `schema.prisma`

Define la estructura que Prisma conoce:

- tablas y nombres físicos;
- columnas, tipos, valores predeterminados y campos opcionales;
- enums de negocio;
- claves primarias, únicas e índices;
- relaciones y claves foráneas.

Prisma es la forma habitual de consultar y escribir los datos, pero no expresa por completo las reglas de negocio duras de PostgreSQL.

### `backend/prisma/migrations/0001_init/migration.sql`

Se aplica como migración inicial y agrega, después de la estructura Prisma:

- `CHECK` para montos, vigencias, hashes, MIME y referencias;
- índices únicos parciales para impedir más de una versión activa;
- funciones y triggers de inmutabilidad;
- validación del checklist de requisitos;
- máquina de estados del trámite y del borrador de cobro;
- validaciones de cobro y archivos;
- protección de constancias, archivos generados y bitácora;
- prohibición de borrado histórico en entidades críticas.

Por tanto, el comportamiento real es la combinación de ambos archivos. Ejecutar solamente `prisma migrate` no equivale a instalar todas las reglas descritas aquí.

## 3. Convenciones generales

- Las tablas usan nombres en singular y `snake_case`: `tramite`, `version_catalogo`, `grupo_requisito`.
- Las claves primarias son UUID.
- Las fechas de eventos son `timestamptz(3)` y se guardan con zona horaria.
- Los estados controlados usan enums PostgreSQL.
- El archivo binario no se guarda en la base: `Evidencia` y `ArchivoGenerado` guardan su UUID lógico, ruta, hash, MIME y tamaño.
- `@updatedAt` es una comodidad de Prisma; las escrituras realizadas fuera de Prisma deben tener una estrategia equivalente si se necesita actualizar `updated_at`.
- Keycloak es la única fuente de autenticación y autorización. `actor.keycloak_sub` guarda sólo el `sub` opaco para FKs y trazabilidad; no se almacenan nombre, correo, contraseñas, sesiones ni roles.
- La configuración fija es realm `SOAPAP` y cliente `gsts`: `ventanilla` y `finanzas` provienen literalmente de `resource_access.gsts.roles`; `ti` y `direccion` de `realm_access.roles`. Sólo un token con al menos uno de esos claims puede resolver un `actor`.

### Contexto de identidad y autorización

El backend valida criptográficamente cada JWT antes de tocar la base: emisor, audiencia `gsts`, firma obtenida por JWKS, vigencia y claim `sub`. En cada transacción de negocio fija `app.actor_id`, `app.roles` y `app.request_id` con `set_config(..., true)`. Los triggers comparan ese contexto con el actor atribuido y exigen los claims literales necesarios: `ti` para plazos y catálogos, `ventanilla` para borradores y cobros. El claim `finanzas` ya no se usa aquí: la facturación vive en un sistema aparte.

Estas variables de sesión son una defensa frente a errores de implementación; no validan JWTs ni sustituyen la autorización principal del backend. La bitácora almacena el UUID local y el arreglo de roles exactamente como fue recibido, no el `sub`, token, nombre, correo o RFC.

## 4. Mapa funcional de tablas

### Identidad y solicitantes

| Tabla | Para qué sirve |
|---|---|
| `actor` | Proyección pseudónima mínima del `sub` de Keycloak; permite FKs y auditoría sin almacenar PII ni roles. |
| `persona` | Titular, representante, apoderado o receptor fiscal. |
| `tramite_persona` | Relación entre un trámite y una persona, con el rol que desempeña en ese trámite. |

Una misma persona puede participar en varios trámites. La combinación `(tramite_id, persona_id, rol)` no puede repetirse.

### Catálogo de requisitos

| Tabla | Para qué sirve |
|---|---|
| `version_catalogo` | Encabezado versionado del checklist. El trámite guarda aquí la versión que utilizó. |
| `grupo_requisito` | Bloque de requisitos, con orden y filtros de aplicabilidad. |
| `opcion_requisito` | Alternativa válida dentro de un grupo. |
| `opcion_documento` | Documento concreto que debe presentarse para satisfacer una opción. |

La estructura es:

```text
version_catalogo
└── grupo_requisito (Y entre grupos aplicables)
    └── opcion_requisito (O entre opciones del grupo)
        └── opcion_documento (Y entre documentos de la opción)
```

Ejemplo: el grupo `IDENTIFICACION` puede ofrecer las opciones `INE` o `PASAPORTE`; basta una opción. Si la opción `PODER` contiene dos documentos, deben validarse ambos.

### Trámite, evidencias y validaciones

| Tabla | Para qué sirve |
|---|---|
| `tramite` | Expediente principal, tipo de constancia, representación, estado y versión de catálogo estampada. Para `NO_REGISTRO` incluye el domicilio del predio (`domicilio_calle`, `domicilio_numero`, `domicilio_colonia`, `domicilio_pertenece_a` enum `JUNTA_AUXILIAR`\|`MUNICIPIO`, `domicilio_pertenece_a_nombre` texto libre) — va impreso en la constancia. Sin catálogo de juntas auxiliares/municipios a propósito (la zona de cobertura abarca Puebla y 4 municipios más); todos opcionales, mismo nivel de laxitud que `nis`. |
| `evidencia` | Metadatos de un documento cargado para una `opcion_documento`. |
| `validacion_no_adeudo` | Resultado de la consulta manual o API, en la validación inicial o en la revalidación al cobrar. |
| `confirmacion_manual` | Confirmación atribuible de firmas, facultades o condición de no adeudo. |
| `consulta_concesionaria` | Observación estructurada de una consulta a la concesionaria. |
| `configuracion_plazos` | Configuración singleton, visible y modificable únicamente con el claim `ti`, del plazo de pago. El plazo fiscal para solicitar factura lo calcula el sistema Finanzas. |
| `configuracion_constancia` | Parámetros con los que el backend genera el PDF de la constancia: `vigencia_dias`, `firmante_nombre` y `firmante_cargo`. A diferencia de `configuracion_plazos`, **no es singleton**: la PK es `tipo_constancia`, una fila por tipo, porque el plazo legal puede diferir. Sólo `ti`. Nace vacía a propósito. |

El campo `tramite.version_catalogo_id` es un snapshot lógico. Si después se publica una nueva versión, los trámites existentes siguen evaluándose con la versión que ya tenían.

### Tarifas, cobro y emisión

| Tabla | Para qué sirve |
|---|---|
| `tarifa` | Monto versionado por tipo de constancia y concepto. |
| `motivo_reduccion` | Catálogo simple (no versionado ni publicado como catálogo/tarifa) de motivos de reducción de tarifa, gestionado solo por `ti`. El porcentaje se congela en `cobro`/`borrador_cobro` al aplicarse: editar o desactivar un motivo después nunca altera cobros ya registrados. |
| `borrador_cobro` | Captura provisional del pago que cualquier Ventanilla puede retomar; no es un cobro confirmado. Incluye referencia opcional al comprobante de pago (voucher) adjunto: `comprobante_archivo_uuid`, `comprobante_nombre_original`, `comprobante_hash_sha256`, `comprobante_mime_type`, `comprobante_tamano_bytes` — mismo patrón que `evidencia`, el archivo vive en NFS (scope `comprobantes`). |
| `cobro` | Monto base, reducción (con FK opcional a `motivo_reduccion`), monto final, forma y método de pago; estampa la tarifa utilizada. Mismas 5 columnas de comprobante de pago que `borrador_cobro` — al aplicar un borrador, se copian ahí, sin volver a escribir en NFS. |
| `constancia` | Folio, hash, archivo, firma opcional y vigencia del documento emitido. |
| `archivo_generado` | Metadatos del PDF u otro archivo generado, asociado siempre a una constancia. |

El cobro congela sus importes. Cambiar una tarifa futura no debe cambiar el cobro ya registrado.

### Auditoría
| `bitacora` | Auditoría append-only de acciones, transiciones, actor, origen y datos relevantes. |

## 5. Reglas principales implementadas en SQL

### Catálogos y tarifas 

- Una versión activa debe estar publicada: `activa = true` implica `publicada = true`.
- Sólo puede existir una versión de catálogo activa.
- Una tarifa debe tener monto mayor que cero.
- Una tarifa activa debe estar publicada.
- Sólo puede existir una tarifa activa por `(tipo_constancia, concepto)`.
- Si se proporcionan ambas fechas, `vigente_hasta` debe ser posterior a `vigente_desde`.
- Una versión publicada no se elimina y su identidad, número, publicación, fecha de inicio y creación no se cambian.
- La estructura hija de una versión publicada (`grupo_requisito`, `opcion_requisito`, `opcion_documento`) no se puede insertar, mover, modificar ni eliminar.
- Una tarifa publicada es inmutable; una modificación de precio o condiciones requiere otra fila con una nueva versión.

### Plazos operativos

- `configuracion_plazos` es una sola fila con los días máximos para pago.
- Sólo un actor cuyo token contenga el claim literal `ti` puede crear, activar, desactivar o actualizar esta configuración.
- La configuración debe estar activa y el plazo debe ser mayor que cero para aprobar trámites.
- Al aprobar, la base calcula y estampa `tramite.plazo_pago_hasta`; un cambio posterior de configuración no altera ese vencimiento histórico.

### Configuración de constancias

- `configuracion_constancia` tiene una fila por `tipo_constancia` con la vigencia en días naturales, los datos del firmante y el prefijo del número de oficio que se imprimen en el PDF. Sólo `ti`.
- `oficio_prefijo` se compone con el año de emisión como `{oficioPrefijo}/{año}` (p. ej. `SOAPAP/GSTS/CNR/2026`), sin consecutivo: todas las constancias del mismo tipo y año comparten el mismo número de oficio. No identifica el documento — para eso está el folio, que se sigue imprimiendo junto al oficio.
- **No hay valores por defecto ni semilla**: si falta la fila del tipo que se está emitiendo, la emisión falla con `CONSTANCIA_CONFIG_NOT_SET`. Es deliberado — la vigencia de un documento oficial no debe caer a un número que nadie decidió en Administración.
- La vigencia no se guarda como fecha: el backend calcula `vigencia_fin = emitida_at + vigencia_dias` al emitir y congela el resultado en `constancia`. El mismo número se interpola en el cuerpo impreso, de modo que el documento no pueda contradecir su propia vigencia registrada.
- Cambiar la configuración nunca altera constancias ya emitidas: `trg_constancia_inmutable` bloquea cualquier `UPDATE` sobre los campos canónicos.
- Sin regla dura en SQL: `vigencia_dias` sólo se valida en el schema Zod (entero positivo). El resto de la integridad la da la ausencia de default.

### Administración: asistente de catálogos operativos

El módulo de Administración deberá incluir un **asistente de creación de catálogos**. Su acceso, consulta, ejecución, publicación y activación estarán disponibles exclusivamente para tokens con el claim `ti`. No crea una entidad nueva ni sustituye las reglas de versionado: guía y controla la captura sobre `version_catalogo`, `grupo_requisito`, `opcion_requisito`, `opcion_documento` y `tarifa` ya existentes.

El asistente debe permitir crear un catálogo de requisitos o una tarifa desde cero, o partir de una versión previa como base. Debe conservar el resultado como borrador hasta que el usuario de TI confirme su publicación. Sus etapas mínimas son:

1. seleccionar el tipo de catálogo, la nueva versión y, opcionalmente, la versión o tarifa que se clonará;
2. capturar vigencia, tipo de constancia, concepto y demás datos de encabezado;
3. para requisitos, construir ordenadamente grupos, filtros de aplicabilidad, opciones y documentos; para tarifas, capturar monto y condiciones de vigencia;
4. validar claves, órdenes, vigencias, cobertura de combinaciones y restricciones de publicación;
5. mostrar una vista previa del catálogo o tarifa resultante y solicitar confirmación explícita;
6. publicar y activar en una transacción, desactivando la versión o tarifa anterior cuando corresponda, y registrar la acción en `bitacora`.

El asistente no debe permitir editar contenido publicado. Una corrección posterior se realiza creando una nueva versión o tarifa en borrador. Su uso administrativo no amplía los permisos de Ventanilla ni de Finanzas; éstos siguen consultando y operando exclusivamente con los catálogos activos que les correspondan.

### Primer acceso administrativo

No existe bootstrap ni administración de usuarios en PostgreSQL. La primera persona administradora se habilita asignándole el rol de realm literal `ti` en Keycloak, dentro del realm `SOAPAP`. Al iniciar sesión con un token válido para el cliente `gsts`, el backend crea o resuelve su `actor` de forma idempotente usando exclusivamente el claim `sub`.

La baja, recuperación y cambio de permisos se realizan sólo en Keycloak. GSTS no puede asignar roles ni reactivar identidades. La creación del `actor` no contiene PII y queda trazada mediante bitácora técnica cuando corresponda.

### Evidencias

- El documento de una evidencia debe pertenecer a la misma versión de catálogo que el trámite.
- El tamaño debe ser mayor que cero.
- El hash debe tener 64 caracteres hexadecimales, compatible con SHA-256.
- Los MIME permitidos son `application/pdf`, `image/jpeg` y `image/png`.
- El tamaño acumulado de evidencias por trámite no puede exceder 30 MiB (`31,457,280` bytes).
- Las evidencias de entidades críticas no se borran; se conserva su historial mediante estado y bitácora.

### Trámites

Las transiciones permitidas son:

```text
CAPTURA ──> EN_VALIDACION ──> APROBADO ──> COBRO ──> FINALIZADO
                 │                │
                 └──> RECHAZADO   ├──> RECHAZADO
                                  └──> EXPIRADO
```

Las reglas adicionales son:

- un trámite nuevo debe iniciar en `CAPTURA`;
- `CAPTURA -> EN_VALIDACION` exige que el checklist aplicable esté satisfecho con evidencias `VALIDADO`;
- `EN_VALIDACION -> APROBADO` exige la validación inicial del tipo: `SIN_ADEUDO` en `validacion_no_adeudo` para `NO_ADEUDO`, `SIN_REGISTRO` en `validacion_no_registro` para `NO_REGISTRO`. Son dos tablas paralelas con enums de resultado distintos, de modo que un resultado no puede confundirse con el del otro tipo;
- `EN_VALIDACION -> APROBADO` calcula el plazo de pago desde la configuración activa;
- `APROBADO -> COBRO` exige la revalidación del tipo (`SIN_ADEUDO` / `SIN_REGISTRO`), plazo vigente y un cobro con tarifa publicada, activa y compatible;
- `APROBADO -> EXPIRADO` sólo se permite después de `plazo_pago_hasta` y vence cualquier borrador abierto;
- `COBRO -> FINALIZADO` exige constancia emitida;

El domicilio del predio (`domicilio_calle`/`numero`/`colonia`/`pertenece_a`/`pertenece_a_nombre`, solo `NO_REGISTRO`) **no tiene `CHECK` ni trigger** que lo exija — mismo nivel de laxitud que `nis`: la aplicación (ventanilla) lo exige en la UI antes de crear el trámite, pero la base de datos lo acepta vacío.

La aplicación debe cambiar el estado mediante una operación transaccional y registrar la transición en `bitacora`.

### Cobros y archivos generados

- `motivo_reduccion.porcentaje` debe ser mayor que 0 y menor o igual a 100 (`chk_motivo_reduccion_porcentaje`). No tiene versionado ni publicación como catálogos/tarifas: es un catálogo simple que sólo `ti` gestiona (crear, editar, activar/desactivar).
- El comprobante de pago (voucher) de `borrador_cobro`/`cobro` **no tiene `CHECK` ni trigger** — es opcional en ambas tablas, igual que `referencia_pago`.
- Un `borrador_cobro` sólo puede estar `ABIERTO` mientras el trámite está `APROBADO`, vigente y sin cobro definitivo. Cualquier Ventanilla puede consultarlo y continuarlo.
- Un borrador puede ser `APLICADO`, `VENCIDO` o `CANCELADO`; después de esos estados queda conservado e inmutable.
- Aplicar un borrador exige todos los datos de pago y un `cobro` definitivo idéntico. El flujo directo puede crear ese cobro sin usar borrador.
- `monto_final` debe ser exactamente el resultado redondeado de aplicar la reducción al monto base.
- La tarifa del cobro debe estar publicada, activa y corresponder al tipo de constancia del trámite.
- El portal puede enviar datos fiscales con el folio de la constancia. Para consultar y descargar XML/PDF debe proporcionar folio y RFC; los errores de timbrado se muestran sin detalle técnico.
- Los metadatos canónicos de archivos generados son inmutables; no se borran, se cambia su conservación.
- Cada `archivo_generado` refiere siempre a una constancia.
- Para llegar a `TIMBRADO` se exige UUID, XML y PDF. Para cancelar se exige motivo y UUID sustituto según la regla instalada.

### Bitácora

La bitácora sólo permite `INSERT`.

- Para origen `USUARIO` exige `actor_id`, `roles_snapshot` como arreglo JSON literal, IP, user-agent y `request_id`. El actor y el arreglo deben coincidir con `app.actor_id` y `app.roles` de la transacción.
- Para origen `PORTAL` exige IP, user-agent y `request_id`, sin actor interno.
- El origen `WORKER` y su `job_id` permanecen en el modelo como contrato reservado para la fase posterior; este monorepo no lo genera ni lo consume.
- Las correcciones se registran como nuevos eventos relacionados mediante `correccion_de_id`; nunca se edita el evento original.
- Trámites, cobros y evidencias no se deben borrar; se usan estados de negocio, cancelación, anulación o conservación.

## 6. Cómo crear un catálogo de requisitos correctamente

La operación ordinaria se realizará mediante el asistente de Administración y sólo por un token con claim `ti`. Los pasos siguientes describen las validaciones que el asistente debe presentar y ejecutar; también sirven como procedimiento de contingencia controlado si se requiere revisar la información antes de publicarla.

### Paso 0: definir el cambio antes de tocar la base

Especificar por escrito:

- número de versión nuevo;
- fecha y zona horaria de inicio de vigencia;
- fecha de fin, si se conoce;
- tipos de constancia a los que aplica;
- reglas para `FISICA` y `MORAL`;
- reglas para `TITULAR`, `REPRESENTANTE` y `APODERADO`;
- grupos que serán obligatorios;
- alternativas aceptadas en cada grupo;
- documentos que componen cada alternativa;
- orden y claves estables para pantalla, reportes y auditoría.

No se debe reutilizar la clave de una opción para cambiar su significado. Si `INE` deja de ser aceptada o cambia su composición, la nueva versión puede conservar la clave sólo si representa el mismo concepto; de lo contrario debe usar otra clave.

### Paso 1: crear el encabezado en borrador

Crear una fila en `version_catalogo` con:

```text
publicada = false
activa    = false
vigente_desde = NULL o la fecha planeada
vigente_hasta = NULL o una fecha posterior
```

El `version` debe ser único y normalmente debe incrementarse respecto a la última versión. Una versión en borrador sí puede corregirse.

### Paso 2: crear los grupos

Insertar los grupos en el orden en que deben mostrarse. Usar una `clave` corta, estable y única dentro de la versión, por ejemplo:

```text
IDENTIFICACION
REPRESENTACION
PERSONA_MORAL
VINCULACION_PREDIO
```

La aplicabilidad se configura con tres columnas independientes:

- `aplica_tipo`: `NO_ADEUDO` o `NO_REGISTRO`;
- `aplica_personalidad`: `FISICA` o `MORAL`;
- `aplica_representacion`: `TITULAR`, `REPRESENTANTE` o `APODERADO`.

Un `NULL` significa “sin filtro” y, por tanto, aplica a todos los valores de esa dimensión. Si se llenan varios filtros, deben cumplirse todos. Por ejemplo, un grupo con `aplica_tipo = NO_ADEUDO` y `aplica_personalidad = MORAL` sólo aplica a trámites de no adeudo de personas morales.

### Paso 3: crear las opciones de cada grupo

Cada opción representa una alternativa suficiente para el grupo. Usar `orden` consecutivo y una `clave` única dentro de su grupo:

```text
Grupo IDENTIFICACION
  1 INE
  2 PASAPORTE
```

La lógica es O: el trámite satisface el grupo si satisface al menos una opción.

### Paso 4: crear los documentos de cada opción

Agregar cada archivo requerido como `opcion_documento`, también con orden consecutivo. La lógica es Y: todos los documentos de la opción deben tener una evidencia con estado `VALIDADO`.

Ejemplo:

```text
Opción PODER
  1 Poder notarial completo
  2 Identificación del representante
```

La opción no se considera satisfecha con sólo uno de los dos documentos.

### Paso 5: validar el borrador

Antes de publicar, comprobar como mínimo:

- no hay claves duplicadas dentro del ámbito correspondiente;
- todos los grupos tienen al menos una opción;
- todas las opciones tienen al menos un documento, salvo que una regla explícita defina opciones sin archivo;
- `orden` no es negativo y no tiene duplicados en el mismo nivel;
- cada combinación de filtros tiene sentido para el negocio;
- existe una ruta de cumplimiento para cada combinación permitida de tipo, personalidad y representación;
- los nombres son comprensibles para Ventanilla y no contienen instrucciones ambiguas;
- una simulación de cada tipo de trámite produce exactamente los requisitos esperados;
- el tamaño, MIME y hash de los archivos de prueba cumplen las restricciones de evidencia.

La función `fn_checklist_satisfecho(tramite_id)` evalúa el árbol estampado en el trámite. No evalúa automáticamente un catálogo futuro ni uno distinto al que el trámite tiene en `version_catalogo_id`.

### Paso 6: publicar y activar en una transacción

Publicar sólo después de completar la estructura. La secuencia recomendada es:

1. bloquear la versión que se va a activar;
2. desactivar la versión anterior, si existe;
3. cambiar la nueva versión a `publicada = true`, `activa = true` y establecer `vigente_desde`;
4. confirmar la transacción;
5. registrar en bitácora quién publicó, qué versión sustituyó y qué fecha de vigencia se definió.

La desactivación de la versión anterior debe ocurrir antes de activar la nueva porque existe un índice único parcial que sólo permite una versión con `activa = true`.

Ejemplo conceptual en Prisma:

```ts
await prisma.$transaction(async (tx) => {
  const nueva = await tx.versionCatalogo.findUniqueOrThrow({
    where: { version: nuevaVersion },
  });

  await tx.versionCatalogo.updateMany({
    where: { activa: true },
    data: { activa: false, vigenteHasta: fechaInicio },
  });

  await tx.versionCatalogo.update({
    where: { id: nueva.id },
    data: {
      publicada: true,
      activa: true,
      vigenteDesde: fechaInicio,
    },
  });
});
```

Este ejemplo presupone que la validación del borrador ya ocurrió. La publicación no debe combinarse con cambios de estructura en la misma operación sin una revisión previa.

### Paso 7: usar la versión publicada en nuevos trámites

Al crear un trámite, seleccionar la única versión activa y guardar su `id` en `tramite.version_catalogo_id`. No copiar solamente el número y no resolver requisitos leyendo siempre la versión activa: eso rompería el histórico cuando aparezca una versión posterior.

Los trámites ya creados continúan usando la versión estampada, aunque ésta deje de estar activa.

## 7. Cómo crear o cambiar tarifas

Las tarifas siguen el mismo patrón de versionado, aunque no tienen una tabla de encabezado separada. El asistente de Administración, exclusivo de tokens con claim `ti`, debe conducir esta captura y bloquear la publicación hasta completar las validaciones:

1. insertar una nueva fila con `publicada = false` y `activa = false`;
2. asignar nuevo `version` para el mismo `(tipo_constancia, concepto)`;
3. comprobar que `monto > 0` y que las fechas son coherentes;
4. publicar y activar la nueva tarifa en una transacción;
5. desactivar la tarifa anterior antes de activar la nueva;
6. dejar que los cobros nuevos estampen la tarifa nueva.

Nunca se debe actualizar el `monto` de una tarifa publicada. El cobro guarda `monto_base`, `porcentaje_reduccion` y `monto_final`, por lo que el histórico no debe recalcularse a partir de la tarifa vigente actual.

## 8. Flujo recomendado para un trámite

1. `CAPTURA`: crear el trámite con la versión activa, personas, roles y evidencias.
2. Validar evidencias: mover cada una a `VALIDADO` sólo después de revisión.
3. `EN_VALIDACION`: solicitar el cambio; PostgreSQL comprobará el checklist.
4. Registrar `validacion_no_adeudo` inicial y confirmaciones manuales que correspondan.
5. `APROBADO` o `RECHAZADO`: guardar motivo cuando corresponda. Al aprobar se calcula `plazo_pago_hasta` con la configuración de TI.
6. En `APROBADO`, Ventanilla puede guardar un `borrador_cobro` y retomarlo desde cualquier ventanilla, o continuar directamente a la validación de pago.
7. Antes del cobro, registrar la revalidación si el tipo es `NO_ADEUDO`; validar tarifa, montos y datos de pago. Si se usa borrador, aplicarlo sólo cuando coincida con el cobro definitivo.
8. Si el plazo vence, mover a `EXPIRADO` y conservar el borrador como `VENCIDO`; no se permite cobrarlo después.
9. `COBRO`: emitir la constancia. Si el ciudadano dice querer factura, se registra en `cobro.factura_solicitada_en_ventanilla` como dato informativo; el CFDI lo emite el sistema Finanzas.
10. La factura se solicita en el portal del sistema Finanzas con el folio de la constancia, dentro del plazo fiscal que ese sistema calcula desde la fecha de pago.
11. La obtención de CFDI, el guardado de UUID/XML/PDF y el paso a `TIMBRADO` son responsabilidad del worker futuro; esta API no los invoca.
12. `FINALIZADO`: ejecutar cuando exista constancia emitida. Ya no depende de ninguna factura.
13. Registrar cada acción significativa en `bitacora` dentro de la misma unidad transaccional que el cambio de negocio.

## 9. Consultas de control recomendadas

### Única versión activa

```sql
SELECT version, publicada, activa, vigente_desde, vigente_hasta
FROM version_catalogo
WHERE activa;
```

### Árbol de un catálogo

```sql
SELECT
  v.version,
  g.orden AS orden_grupo,
  g.clave AS grupo,
  o.orden AS orden_opcion,
  o.clave AS opcion,
  d.orden AS orden_documento,
  d.nombre AS documento
FROM version_catalogo v
JOIN grupo_requisito g ON g.version_catalogo_id = v.id
JOIN opcion_requisito o ON o.grupo_id = g.id
JOIN opcion_documento d ON d.opcion_id = o.id
WHERE v.version = :version
ORDER BY g.orden, o.orden, d.orden;
```

### Trámites que usan una versión anterior

```sql
SELECT t.numero_tramite, t.estado, v.version
FROM tramite t
JOIN version_catalogo v ON v.id = t.version_catalogo_id
WHERE v.version <> (SELECT version FROM version_catalogo WHERE activa)
ORDER BY t.created_at;
```

## 10. Publicación segura y despliegue

Orden recomendado en un ambiente:

1. aplicar la migración estructural generada para el `schema.prisma`;
2. verificar que existan todas las tablas, enums, claves foráneas e índices;
3. ejecutar la migración complementaria una sola vez por versión de base;
4. ejecutar pruebas negativas de cada trigger y `CHECK`;
5. cargar catálogos y tarifas en borrador mediante el asistente de Administración con claim `ti`;
6. revisar y publicar mediante la confirmación controlada del asistente;
7. verificar la versión activa, la tarifa activa y los permisos del rol de aplicación.

La migración complementaria contiene `DROP TRIGGER IF EXISTS` y reemplazo de constraints, por lo que está preparada para sustituir reglas de una versión anterior, pero no debe ejecutarse repetidamente como si fuera una migración de datos común sin confirmar el estado del ambiente.

## 11. Puntos que deben validarse antes de producción

Esta guía describe lo que efectivamente expresan los dos archivos analizados. Hay decisiones que el esquema todavía deja abiertas y deben resolverse con negocio, Finanzas, Jurídico y TI:

- ~~reglas de descuentos: el porcentaje y su importe quedan en `cobro`, pero no existe un catálogo versionado de fundamentos y autorizaciones~~ — resuelto parcialmente con `motivo_reduccion` (catálogo simple gestionado por `ti`, sin versionado/publicación); sigue abierto si el negocio requiere además una autorización o justificación documentada por reducción aplicada;
- obligatoriedad de `nis` para `NO_ADEUDO` y del domicilio del predio para `NO_REGISTRO` — ambos ya existen como columnas opcionales sin regla dura; sigue abierto si algún día deben volverse obligatorios a nivel de base de datos, y si el comprobante de pago del cobro debería seguir el mismo camino;
- unicidad y coherencia de titular, representante, apoderado y receptor fiscal por trámite;
- campos fiscales que el PAC exige antes de timbrar;
- firma digital institucional, ya que `firma_digital` y `certificado_id` todavía son opcionales;
- permisos reales del rol de aplicación para impedir `UPDATE`/`DELETE` sobre bitácora y borrados de entidades críticas;
- estrategia de retención, respaldo y reconciliación entre NFS y las referencias de archivos.

## 12. Advertencia sobre el historial de migraciones

Al comparar los archivos del proyecto, la primera migración histórica contiene una versión anterior de `evidencia` con `opcion_requisito_id`, mientras que el `schema.prisma` actual sólo modela `opcion_documento_id`. Además, `20260701180834_init/migration.sql` está vacío.

Antes de promover el modelo, comprobar en cada ambiente:

- qué migraciones ya fueron aplicadas;
- si la tabla `evidencia` coincide exactamente con el esquema actual;
- si la migración complementaria se instaló completa;
- si existe drift de Prisma.

Si una migración ya fue compartida o aplicada, no se debe reescribir su historial: se debe crear una migración correctiva nueva y documentar la transición. La base de datos de producción debe terminar con una sola estructura coherente con el `schema.prisma` vigente y con todas las reglas complementarias instaladas.

## 13. Resumen operativo

La forma correcta de mantener el sistema es:

```text
definir cambio
  -> actor con claim ti crea versión/tarifa en borrador mediante el asistente
  -> construir árbol completo
  -> validar combinaciones y checklist
  -> publicar y activar en transacción
  -> estampar la versión en nuevos trámites
  -> nunca editar lo ya publicado
```

En términos prácticos: un catálogo publicado es una fotografía histórica inmutable; una nueva necesidad se resuelve creando otra fotografía, activándola para nuevos trámites y conservando las anteriores para que los expedientes existentes sigan siendo reproducibles.
