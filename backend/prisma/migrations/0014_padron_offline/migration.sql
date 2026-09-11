-- Catálogo offline del padrón de usuarios de agua/drenaje (SOAPAP): resuelve
-- nombre y domicilio por NIS mientras la integración real con OUC (no adeudo)
-- y SII-Cart (no registro) sigue bloqueada por trámites burocráticos ajenos
-- al desarrollo. Puramente aditivo: un enum y una tabla nuevos, sin FKs (nis
-- es texto libre, igual que Tramite.nis) y sin tocar nada existente.
--
-- ⚠️  LAS REGLAS QUE LE DAN SENTIDO NO ESTÁN AQUÍ. `fn_padron_offline_integridad`
--     —en migration_complementaria.sql, que es un paso APARTE de
--     `prisma migrate deploy`— es la que exige rol `ti` para origen IMPORTADO
--     y rol `ventanilla` para CAPTURADO_MANUAL, y bloquea que un registro ya
--     importado se reclasifique como capturado a mano. Si sólo se aplica esta
--     migración, la tabla existe pero cualquier rol puede escribir cualquier
--     origen.

-- CreateEnum
CREATE TYPE "OrigenPadron" AS ENUM ('IMPORTADO', 'CAPTURADO_MANUAL');

-- CreateTable
CREATE TABLE "padron_offline" (
    "nis" TEXT NOT NULL,
    "fecha_contrato" TIMESTAMPTZ(3),
    "propietario" TEXT NOT NULL,
    "titular_pago" TEXT,
    "domicilio_calle" TEXT NOT NULL,
    "domicilio_numero" TEXT NOT NULL,
    "domicilio_colonia" TEXT NOT NULL,
    "domicilio_pertenece_a" "PerteneceA",
    "domicilio_pertenece_a_nombre" TEXT,
    "origen" "OrigenPadron" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "padron_offline_pkey" PRIMARY KEY ("nis")
);
