-- AlterTable
ALTER TABLE "borrador_cobro" ADD COLUMN "comprobante_archivo_uuid" UUID,
ADD COLUMN "comprobante_nombre_original" TEXT,
ADD COLUMN "comprobante_hash_sha256" TEXT,
ADD COLUMN "comprobante_mime_type" TEXT,
ADD COLUMN "comprobante_tamano_bytes" INTEGER;

-- AlterTable
ALTER TABLE "cobro" ADD COLUMN "comprobante_archivo_uuid" UUID,
ADD COLUMN "comprobante_nombre_original" TEXT,
ADD COLUMN "comprobante_hash_sha256" TEXT,
ADD COLUMN "comprobante_mime_type" TEXT,
ADD COLUMN "comprobante_tamano_bytes" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "borrador_cobro_comprobante_archivo_uuid_key" ON "borrador_cobro"("comprobante_archivo_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "cobro_comprobante_archivo_uuid_key" ON "cobro"("comprobante_archivo_uuid");
