-- CreateEnum
CREATE TYPE "PerteneceA" AS ENUM ('JUNTA_AUXILIAR', 'MUNICIPIO');

-- AlterTable
ALTER TABLE "tramite" ADD COLUMN "domicilio_calle" TEXT,
ADD COLUMN "domicilio_numero" TEXT,
ADD COLUMN "domicilio_colonia" TEXT,
ADD COLUMN "domicilio_pertenece_a" "PerteneceA",
ADD COLUMN "domicilio_pertenece_a_nombre" TEXT;
