# Handoff · Validación sustantiva de No Registro

> **Implementado.** El trabajo de frontend descrito en la sección 4 ya está construido: `PasoValidacion.tsx`
> captura `SIN_REGISTRO`/`CON_REGISTRO`, `PasoCobro.tsx` generaliza la revalidación para los dos tipos y
> `TramiteWizard.tsx` generalizó `validacionInicialOk`, con el segundo hook (`useRegistrarValidacionNoRegistro`)
> en `features/validaciones/api.ts`. Este documento se conserva como registro del porqué (§1) y de las
> reglas de negocio (§3); las secciones 4 y 5 describen trabajo ya cerrado, no un pendiente — ver
> `documentacion/PENDIENTES_BACKEND_FRONTEND.md`.

> **Para la sesión de frontend.** Este documento y el **OpenAPI regenerado** son las dos fuentes: consúltalos juntos. El OpenAPI da la forma exacta de los tipos; esto da el porqué, las reglas de la base que no se ven en el contrato y la lista de lo que hay que tocar.
>
> Primer paso, con el backend corriendo:
> ```bash
> npm run gen:api -w frontend    # regenera frontend/src/api/schema.d.ts
> ```
> **Eso rompe el typecheck a propósito** (ver §5). Es la señal de por dónde empezar.

---

## 1. Qué problema resuelve

Los dos tipos de constancia no se sostenían en lo mismo.

Aprobar un trámite de **No Adeudo** siempre exigió un hecho verificado: una fila en `validacion_no_adeudo` con `SIN_ADEUDO`, y otra igual antes de cobrar. Aprobar uno de **No Registro** sólo exigía que el checklist documental estuviera completo — **nada obligaba a que alguien hubiera consultado el padrón**, pese a que el documento que se emite afirma literalmente:

> «En una minuciosa revisión al sistema para verificar la existencia de registro del citado predio, se observó que no existe registro alguno, dando como consecuencia que no tengo número de cuenta asignado.»

Es decir: SOAPAP firmaba una afirmación sobre su propio padrón sin que el sistema exigiera comprobarla. Este cambio cierra esa asimetría.

---

## 2. Qué se agregó en el backend

### Tabla y enum

```prisma
enum ResultadoValidacionRegistro { SIN_REGISTRO  CON_REGISTRO }

model ValidacionNoRegistro {          // → validacion_no_registro
  id, tramiteId, metodo, momento, resultado, referenciaOuc?, validadoPorId?, validadoAt
  @@unique([tramiteId, momento])
}
```

Espeja `ValidacionNoAdeudo` y **reusa** `MetodoValidacion` (`MANUAL`/`API`) y `MomentoValidacion` (`VALIDACION_INICIAL`/`REVALIDACION_COBRO`). No lleva `adeudoMonto`: no hay monto que registrar cuando el predio no tiene cuenta.

**El enum de resultado es propio, no compartido.** Es deliberado: así `SIN_ADEUDO` es *inexpresable* en una validación de no registro, sin necesidad de una regla que lo vigile. Para el frontend esto significa que **no puedes reusar el mismo tipo ni el mismo hook** entre los dos flujos.

Migración: `backend/prisma/migrations/0009_validacion_no_registro/` (aditiva).

### Endpoint

```
POST /api/v1/tramites/{id}/validaciones/no-registro     rol: ventanilla
```

**Request** (`ValidacionNoRegistroRequest`):

```json
{
  "metodo": "MANUAL",
  "momento": "VALIDACION_INICIAL",
  "resultado": "SIN_REGISTRO",
  "referenciaOuc": "FOLIO-123"
}
```

- `metodo` — `MANUAL` | `API`. **Siempre `MANUAL` por ahora**: el puerto OUC no tiene implementación.
- `momento` — `VALIDACION_INICIAL` | `REVALIDACION_COBRO`.
- `resultado` — `SIN_REGISTRO` | `CON_REGISTRO`.
- `referenciaOuc` — opcional, 1..255. Folio de la consulta.

**Response** `200` con la envolvente de siempre, `{ data: ValidacionNoRegistro, requestId }`:

```json
{
  "data": {
    "id": "…", "tramiteId": "…",
    "metodo": "MANUAL", "momento": "VALIDACION_INICIAL", "resultado": "SIN_REGISTRO",
    "referenciaOuc": "FOLIO-123",
    "validadoPorId": "…", "validadoAt": "2026-08-12T…"
  },
  "requestId": "…"
}
```

**Es un upsert por `[tramiteId, momento]`**: repetir el mismo momento *corrige* el resultado en vez de duplicar la fila. Igual que el de No Adeudo.

### Detalle del trámite — cambio incompatible

`GET /tramites/{id}` cambia de forma:

| Antes | Ahora |
|---|---|
| `validaciones: ValidacionNoAdeudo[]` | `validacionesNoAdeudo: ValidacionNoAdeudo[]` |
| — | `validacionesNoRegistro: ValidacionNoRegistro[]` |

Se renombró porque `validaciones` a secas significaba «las de no adeudo» y dejó de leerse solo al aparecer el segundo tipo. **Un trámite sólo llena el arreglo de su tipo; el otro llega vacío.**

---

## 3. Cómo quedan gateadas las transiciones

Las reglas están en `fn_tramite_transicion_valida` (`backend/prisma/migration_complementaria.sql`), no en el backend. **Un 409 desde la base es la última palabra**, aunque la UI crea que puede.

| Transición | `NO_ADEUDO` | `NO_REGISTRO` |
|---|---|---|
| `EN_VALIDACION → APROBADO` | `VALIDACION_INICIAL` + `SIN_ADEUDO` | `VALIDACION_INICIAL` + **`SIN_REGISTRO`** |
| `APROBADO → COBRO` | `REVALIDACION_COBRO` + `SIN_ADEUDO` | `REVALIDACION_COBRO` + **`SIN_REGISTRO`** |

Mensajes que devuelve la base, ya traducidos a `409 RULE_VIOLATION` por `traducirErrorPrisma`:

- `No se puede aprobar sin validacion inicial SIN_REGISTRO`
- `No se puede cobrar sin revalidacion SIN_REGISTRO`

**Registrar `CON_REGISTRO` es legítimo y esperado**: es el hallazgo de que el predio sí está en el padrón. Deja el trámite bloqueado a propósito — la salida es rechazarlo, no corregir el resultado a la fuerza. Aun así, como el endpoint hace upsert, corregir un error de captura es posible reenviando el mismo `momento`.

---

## 4. Qué tiene que hacer el frontend

### 4.1 `features/validaciones/api.ts`

Hoy hay un solo hook, `useRegistrarValidacion`, cableado a `/validaciones/no-adeudo` y tipado con `'SIN_ADEUDO' | 'CON_ADEUDO'`. **Hace falta un segundo hook** —path distinto, enum distinto, sin `adeudoMonto`—. No intentes unificarlos con un genérico: el tipo de `resultado` es lo que impide mandar el resultado equivocado al endpoint equivocado, y unificarlos lo perdería.

Ambos deben invalidar `['tramites', tramiteId]` al terminar, como ya hace el existente.

### 4.2 `components/PasoValidacion.tsx`

Hoy sólo ofrece capturar la validación cuando el trámite es de No Adeudo, y lee `tramite.validaciones`. Necesita el caso espejo para `tipoConstancia === 'NO_REGISTRO'`: los mismos dos botones, con las etiquetas del padrón en vez de las del adeudo, sin el campo de monto, y leyendo `tramite.validacionesNoRegistro`.

Copy sugerido (ajústalo con SOAPAP): «Sin registro en el padrón» / «El predio sí está registrado».

### 4.3 `components/PasoCobro.tsx`

La revalidación previa al cobro está atada a `NO_ADEUDO` en tres puntos consecutivos (`revalidada`, `revalidadaConAdeudo`, `requiereRevalidacion`, `puedeCobrar`). **Ahora los dos tipos requieren revalidación**, así que la condición deja de ser «es No Adeudo» y pasa a ser «según el tipo, mira el arreglo que corresponde con el resultado que corresponde».

Ojo con `puedeCobrar`: hoy vale `true` para cualquier tipo que no sea `NO_ADEUDO`. Ese atajo ahora es **incorrecto** y dejaría cobrar sin revalidar hasta que la base lo rechace con un 409.

### 4.4 `pages/TramiteWizard.tsx`

`validacionInicialOk` tiene la misma forma de atajo:

```ts
tramite.tipoConstancia !== 'NO_ADEUDO' || tramite.validaciones.some(…)
```

Es decir, **para No Registro siempre daba `true`** y el botón «Aprobar trámite» se habilitaba sin validación. Hay que generalizarla a los dos tipos. Es sólo UX —la guardia dura la impone la base— pero hoy el usuario llegaría a un 409 sin entender por qué.

### 4.5 El fixture de prueba

`components/PasoEntrega.test.tsx:45` arma un trámite con `validaciones: []`. Hay que renombrarlo y agregar el arreglo nuevo, o el objeto deja de satisfacer el tipo.

### Archivos a modificar

Lista completa, verificada con `grep` sobre el frontend actual:

```
frontend/src/api/schema.d.ts                                    (regenerado, no a mano)
frontend/src/features/validaciones/api.ts                       segundo hook
frontend/src/features/tramites/components/PasoValidacion.tsx    L33  captura inicial
frontend/src/features/tramites/components/PasoCobro.tsx         L57-61  revalidación
frontend/src/features/tramites/pages/TramiteWizard.tsx          L109-111  guardia
frontend/src/features/tramites/components/PasoEntrega.test.tsx  L45  fixture
```

`ResumenPanel.tsx` **no** toca validaciones, pese a mostrar el resumen del trámite: hoy no las refleja. Si quieres que el panel muestre el estado de la validación, es trabajo nuevo, no una corrección.

---

## 5. Qué esperar al empezar

`npm run check -w frontend` **falla en cuanto regeneres los tipos**, porque `tramite.validaciones` ya no existe. Es intencional: es el inventario exacto de lo que hay que tocar. No lo silencies con un alias.

---

## 6. Estado del backend

Hecho y verde (`npm run check` y `npm run test` en la raíz): esquema, migración `0009`, las dos reglas duras, los casos de `verificacion_integridad.sql` (sección **D2**, más las validaciones que hubo que agregar a los flujos de No Registro que ya existían), el endpoint, el DTO del detalle, OpenAPI y la prueba de inventario del contrato.

**Pendiente en la base**, a cargo del usuario tras el reset: `prisma migrate deploy` → re-otorgar permisos (`init_postgres_soapap3.sql`, secciones 3 y 4) → `migration_complementaria.sql` → `verificacion_integridad.sql`.

## 7. Una limitación heredada, por si la ves

**Las validaciones no son inmutables.** No hay trigger que las proteja y el endpoint hace upsert, así que un `SIN_REGISTRO` puede voltearse a `CON_REGISTRO` *después* de que el trámite fue aprobado, sin que nada revierta la aprobación. Ya pasaba con No Adeudo; se replicó tal cual por simetría en vez de arreglarlo a medias en un solo lado. Está anotado en `PENDIENTES_BACKEND_FRONTEND.md` y no es trabajo de la sesión de frontend.
