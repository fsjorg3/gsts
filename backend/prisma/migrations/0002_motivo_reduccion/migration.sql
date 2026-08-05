-- CreateTable
CREATE TABLE "motivo_reduccion" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motivo_reduccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motivo_reduccion_clave_key" ON "motivo_reduccion"("clave");

-- AlterTable
ALTER TABLE "borrador_cobro" ADD COLUMN "motivo_reduccion_id" UUID;

-- AlterTable
ALTER TABLE "cobro" ADD COLUMN "motivo_reduccion_id" UUID;

-- CreateIndex
CREATE INDEX "borrador_cobro_motivo_reduccion_id_idx" ON "borrador_cobro"("motivo_reduccion_id");

-- CreateIndex
CREATE INDEX "cobro_motivo_reduccion_id_idx" ON "cobro"("motivo_reduccion_id");

-- AddForeignKey
ALTER TABLE "borrador_cobro" ADD CONSTRAINT "borrador_cobro_motivo_reduccion_id_fkey" FOREIGN KEY ("motivo_reduccion_id") REFERENCES "motivo_reduccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobro" ADD CONSTRAINT "cobro_motivo_reduccion_id_fkey" FOREIGN KEY ("motivo_reduccion_id") REFERENCES "motivo_reduccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
