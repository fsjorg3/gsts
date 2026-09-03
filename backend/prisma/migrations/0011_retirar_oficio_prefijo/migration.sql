-- oficio_prefijo queda retirado: el número de oficio impreso en la
-- constancia ahora es, literalmente, el folio único (GSTS-{tipo}-{año}-
-- {consecutivo}, ver documento.ts y folio.ts) y ya no se compone aparte con
-- un prefijo configurable desde Administración.

ALTER TABLE "configuracion_constancia" DROP COLUMN "oficio_prefijo";
