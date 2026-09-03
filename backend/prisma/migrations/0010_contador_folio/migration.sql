-- Contador singleton del consecutivo de folio de constancias.
--
-- Puramente aditivo. La fila con id 'FOLIO_CONSTANCIAS' se crea sola en el
-- primer INSERT ... ON CONFLICT que hace folio.ts — no requiere seed.
--
-- El GRANT a sicef_app lo cubre ya ALTER DEFAULT PRIVILEGES en
-- init_postgres_soapap3.sql: no hace falta uno explícito aquí.

-- CreateTable
CREATE TABLE "contador_folio" (
    "id" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contador_folio_pkey" PRIMARY KEY ("id")
);
