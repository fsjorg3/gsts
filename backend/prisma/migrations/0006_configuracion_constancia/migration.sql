-- CreateTable
-- Parámetros de generación del PDF de la constancia (vigencia y firmante), una
-- fila por tipo. Nace vacía a propósito: sin configuración la emisión falla con
-- CONSTANCIA_CONFIG_NOT_SET en vez de asumir una vigencia que nadie decidió.
CREATE TABLE "configuracion_constancia" (
    "tipo_constancia" "TipoConstancia" NOT NULL,
    "vigencia_dias" INTEGER NOT NULL,
    "firmante_nombre" TEXT NOT NULL,
    "firmante_cargo" TEXT NOT NULL,
    "actualizado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracion_constancia_pkey" PRIMARY KEY ("tipo_constancia")
);

-- AddForeignKey
ALTER TABLE "configuracion_constancia" ADD CONSTRAINT "configuracion_constancia_actualizado_por_id_fkey" FOREIGN KEY ("actualizado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
