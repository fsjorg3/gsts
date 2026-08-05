-- Recorte de facturación: el CFDI sale de SICEF hacia el sistema Finanzas.
--
-- Esta migración NO puede generarse con `prisma migrate diff` y aplicarse tal
-- cual: `factura` y `factura_global` tienen triggers de no-borrado instalados
-- por migration_complementaria.sql (`fn_sin_borrado_historico`), y aunque esos
-- triggers son BEFORE DELETE y no BEFORE DROP, las funciones y triggers que
-- referencian estas tablas deben retirarse antes para que el DROP no deje
-- objetos huérfanos que fallen al reinstalar la SQL complementaria.
--
-- Orden: primero los objetos de la capa complementaria, luego la estructura.
--
-- ⚠️  AL TERMINAR ESTA MIGRACIÓN LA BASE QUEDA SIN LAS REGLAS DE NEGOCIO.
--     Se retiran aquí `fn_tramite_transicion_valida`, `fn_cobro_integridad`,
--     `fn_borrador_cobro_integridad` y `fn_archivo_generado_inmutable` porque
--     su cuerpo referencia columnas y tablas que dejan de existir. Las cuatro
--     se recrean —ya sin lo fiscal— al ejecutar `migration_complementaria.sql`,
--     que es un paso APARTE de `prisma migrate deploy`. Si se omite, las
--     transiciones de trámite dejan de validarse en silencio.

-- ---------- 1. Retirar triggers y funciones de la capa complementaria ----------

DROP TRIGGER IF EXISTS trg_factura_sin_borrado ON factura;
DROP TRIGGER IF EXISTS trg_factura_global_sin_borrado ON factura_global;
DROP TRIGGER IF EXISTS trg_factura_integridad ON factura;
DROP TRIGGER IF EXISTS trg_factura_global_integridad ON factura_global;
DROP TRIGGER IF EXISTS trg_factura_global_detalle_integridad ON factura_global_detalle;
DROP TRIGGER IF EXISTS trg_solicitud_factura_integridad ON solicitud_factura;

DROP FUNCTION IF EXISTS fn_factura_integridad();
DROP FUNCTION IF EXISTS fn_factura_global_detalle_integridad();
DROP FUNCTION IF EXISTS fn_solicitud_factura_integridad();

-- Estas dos se vuelven a crear, sin las reglas de facturación, al reinstalar
-- migration_complementaria.sql. Se retiran aquí porque su cuerpo referencia
-- tablas y columnas que dejan de existir más abajo.
DROP TRIGGER IF EXISTS trg_tramite_transicion_valida ON tramite;
DROP TRIGGER IF EXISTS trg_cobro_integridad ON cobro;
DROP TRIGGER IF EXISTS trg_borrador_cobro_integridad ON borrador_cobro;
DROP TRIGGER IF EXISTS trg_archivo_generado_inmutable ON archivo_generado;
DROP FUNCTION IF EXISTS fn_tramite_transicion_valida();
DROP FUNCTION IF EXISTS fn_cobro_integridad();
DROP FUNCTION IF EXISTS fn_borrador_cobro_integridad();
DROP FUNCTION IF EXISTS fn_archivo_generado_inmutable();

-- Índices y CHECK de la capa complementaria sobre tablas que se van.
DROP INDEX IF EXISTS uq_solicitud_factura_unica_pendiente;
ALTER TABLE solicitud_factura DROP CONSTRAINT IF EXISTS chk_solicitud_factura_fecha_limite;
ALTER TABLE solicitud_factura DROP CONSTRAINT IF EXISTS chk_solicitud_factura_receptor;
ALTER TABLE factura_global DROP CONSTRAINT IF EXISTS chk_factura_global_periodo;
ALTER TABLE archivo_generado DROP CONSTRAINT IF EXISTS chk_archivo_generado_ref;
ALTER TABLE configuracion_plazos DROP CONSTRAINT IF EXISTS chk_configuracion_plazos_valores;

-- ---------- 2. Estructura ----------

-- archivo_generado pierde sus dos referencias fiscales. Cualquier fila que
-- colgara de una factura deja de tener sentido en SICEF: se elimina antes de
-- volver constancia_id obligatorio.
DELETE FROM archivo_generado WHERE constancia_id IS NULL;

DROP INDEX IF EXISTS "archivo_generado_factura_id_idx";
DROP INDEX IF EXISTS "archivo_generado_factura_global_id_idx";
ALTER TABLE archivo_generado DROP CONSTRAINT IF EXISTS "archivo_generado_factura_id_fkey";
ALTER TABLE archivo_generado DROP CONSTRAINT IF EXISTS "archivo_generado_factura_global_id_fkey";
ALTER TABLE archivo_generado DROP COLUMN IF EXISTS factura_id;
ALTER TABLE archivo_generado DROP COLUMN IF EXISTS factura_global_id;
ALTER TABLE archivo_generado ALTER COLUMN constancia_id SET NOT NULL;

DROP TABLE IF EXISTS factura_global_detalle;
DROP TABLE IF EXISTS solicitud_factura;
DROP TABLE IF EXISTS factura;
DROP TABLE IF EXISTS factura_global;

DROP TYPE IF EXISTS "EstadoFactura";
DROP TYPE IF EXISTS "EstadoSolicitudFactura";

-- El receptor fiscal es un dato del sistema Finanzas y allá vive como snapshot
-- congelado, no como persona registrada en un trámite.
DELETE FROM tramite_persona WHERE rol = 'RECEPTOR_FISCAL';
ALTER TYPE "RolPersona" RENAME TO "RolPersona_old";
CREATE TYPE "RolPersona" AS ENUM ('TITULAR', 'REPRESENTANTE', 'APODERADO');
ALTER TABLE tramite_persona ALTER COLUMN rol TYPE "RolPersona" USING rol::text::"RolPersona";
DROP TYPE "RolPersona_old";

-- El plazo fiscal lo calcula Finanzas desde la fecha de pago.
ALTER TABLE configuracion_plazos DROP COLUMN IF EXISTS plazo_solicitud_factura_dias;

-- Deja de ser un estado (tres reglas de BD dependían de él) y pasa a ser el
-- dato informativo de lo que contestó el solicitante en ventanilla.
ALTER TABLE cobro RENAME COLUMN requiere_factura TO factura_solicitada_en_ventanilla;
ALTER TABLE borrador_cobro RENAME COLUMN requiere_factura TO factura_solicitada_en_ventanilla;
