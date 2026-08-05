-- AlterTable
-- La tabla constancia está vacía en este corte, así que las columnas nacen
-- NOT NULL sin default ni backfill. Si se aplicara sobre una base con
-- constancias emitidas, habría que agregarlas nullable, backfillear y recién
-- entonces imponer NOT NULL (trg_constancia_inmutable bloquea el UPDATE, por
-- lo que el backfill exigiría desactivar el trigger).
ALTER TABLE "constancia" ADD COLUMN "hash_contenido" TEXT NOT NULL,
ADD COLUMN "version_token" TEXT NOT NULL;
