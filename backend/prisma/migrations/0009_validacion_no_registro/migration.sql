-- Validación sustantiva de No Registro: espeja validacion_no_adeudo.
--
-- Puramente aditiva: un enum y una tabla nuevos, sin tocar nada existente.
--
-- ⚠️  LAS REGLAS QUE LE DAN SENTIDO NO ESTÁN AQUÍ. `fn_tramite_transicion_valida`
--     —en migration_complementaria.sql, que es un paso APARTE de
--     `prisma migrate deploy`— es la que exige SIN_REGISTRO para aprobar y para
--     cobrar. Si sólo se aplica esta migración, la tabla existe pero nadie la
--     obliga a llenarse y un trámite de No Registro se aprueba sin validar.

-- CreateEnum
CREATE TYPE "ResultadoValidacionRegistro" AS ENUM ('SIN_REGISTRO', 'CON_REGISTRO');

-- CreateTable
CREATE TABLE "validacion_no_registro" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "metodo" "MetodoValidacion" NOT NULL,
    "momento" "MomentoValidacion" NOT NULL,
    "resultado" "ResultadoValidacionRegistro" NOT NULL,
    "referencia_ouc" TEXT,
    "validado_por_id" UUID,
    "validado_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validacion_no_registro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "validacion_no_registro_tramite_id_momento_key" ON "validacion_no_registro"("tramite_id", "momento");

-- AddForeignKey
ALTER TABLE "validacion_no_registro" ADD CONSTRAINT "validacion_no_registro_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacion_no_registro" ADD CONSTRAINT "validacion_no_registro_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
