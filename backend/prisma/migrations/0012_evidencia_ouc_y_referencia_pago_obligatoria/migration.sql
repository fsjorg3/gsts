-- referencia_ouc era un folio de texto libre, no verificable. Dirección
-- General pidió sustituirlo por evidencia fotográfica obligatoria (foto/
-- captura de la consulta a OUC), en ambos modelos de validación. Como el
-- sistema aún no tiene datos en producción, el reemplazo es directo, sin
-- backfill.
--
-- referencia_pago en cobro pasa de opcional a obligatorio. borrador_cobro.
-- referencia_pago se queda nullable a propósito: el borrador sigue
-- permitiendo guardado parcial, y la obligatoriedad se exige en la
-- aplicación (POST .../aplicar), no en la columna.

-- AlterTable
ALTER TABLE "validacion_no_adeudo"
  DROP COLUMN "referencia_ouc",
  ADD COLUMN "evidencia_ouc_archivo_uuid" UUID NOT NULL,
  ADD COLUMN "evidencia_ouc_nombre_original" TEXT NOT NULL,
  ADD COLUMN "evidencia_ouc_hash_sha256" TEXT NOT NULL,
  ADD COLUMN "evidencia_ouc_mime_type" TEXT NOT NULL,
  ADD COLUMN "evidencia_ouc_tamano_bytes" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "validacion_no_adeudo_evidencia_ouc_archivo_uuid_key" ON "validacion_no_adeudo"("evidencia_ouc_archivo_uuid");

-- AlterTable
ALTER TABLE "validacion_no_registro"
  DROP COLUMN "referencia_ouc",
  ADD COLUMN "evidencia_ouc_archivo_uuid" UUID NOT NULL,
  ADD COLUMN "evidencia_ouc_nombre_original" TEXT NOT NULL,
  ADD COLUMN "evidencia_ouc_hash_sha256" TEXT NOT NULL,
  ADD COLUMN "evidencia_ouc_mime_type" TEXT NOT NULL,
  ADD COLUMN "evidencia_ouc_tamano_bytes" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "validacion_no_registro_evidencia_ouc_archivo_uuid_key" ON "validacion_no_registro"("evidencia_ouc_archivo_uuid");

-- AlterTable
ALTER TABLE "cobro" ALTER COLUMN "referencia_pago" SET NOT NULL;
