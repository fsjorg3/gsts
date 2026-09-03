-- Dirección General pidió que la revalidación previa al cobro (REVALIDACION_COBRO)
-- no se exija cuando ventanilla cobra inmediatamente después de aprobar. Se agrega
-- una ventana de gracia, en minutos, contada desde el instante de aprobación:
-- Tramite.aprobado_en (nuevo, estampado por el trigger al aprobar) y
-- ConfiguracionPlazos.revalidacion_gracia_minutos (nuevo, default 0 = comportamiento
-- actual sin cambios hasta que "ti" configure explícitamente una ventana).

-- AlterTable
ALTER TABLE "tramite" ADD COLUMN "aprobado_en" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "configuracion_plazos" ADD COLUMN "revalidacion_gracia_minutos" INTEGER NOT NULL DEFAULT 0;
