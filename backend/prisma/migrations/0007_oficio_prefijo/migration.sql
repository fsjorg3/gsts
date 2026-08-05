-- AddColumn
-- oficio_prefijo se compone con el año de emisión como "{prefijo}/{año}" al
-- imprimir el número de oficio en la constancia (sin consecutivo; el folio
-- sigue siendo el identificador único del documento). La tabla ya puede tener
-- filas configuradas por Administración, así que se agrega con un default
-- temporal, se rellena para los tipos ya configurados y luego se vuelve
-- obligatoria sin default: toda fila nueva debe traerlo explícito.
ALTER TABLE "configuracion_constancia" ADD COLUMN "oficio_prefijo" TEXT NOT NULL DEFAULT '';

UPDATE "configuracion_constancia" SET "oficio_prefijo" = 'SOAPAP/GSTS/CNR' WHERE "tipo_constancia" = 'NO_REGISTRO';

ALTER TABLE "configuracion_constancia" ALTER COLUMN "oficio_prefijo" DROP DEFAULT;
