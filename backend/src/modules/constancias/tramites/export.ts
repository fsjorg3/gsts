import ExcelJS from 'exceljs';
import type { Prisma } from '@prisma/client';

// Fila plana lista para el XLSX: la trae `GET /tramites/export` con el mismo
// `include` que ya arma `GET /tramites/{id}` (personas+persona, cobro,
// constancia), sin el resto del detalle (evidencias, validaciones,
// confirmaciones) que ese endpoint sí necesita.
export type TramiteParaExportar = Prisma.TramiteGetPayload<{
  include: { personas: { include: { persona: true } }; cobro: true; constancia: true };
}>;

const ENCABEZADOS = [
  'Número de trámite',
  'Tipo de constancia',
  'Estado',
  'Titular',
  'NIS',
  'Domicilio',
  'Monto base',
  'Monto final',
  'Forma de pago',
  'Folio de constancia',
  'Vigencia inicio',
  'Vigencia fin',
  'Anulada',
  'Creado',
] as const;

const TIPO_CONSTANCIA: Record<string, string> = { NO_ADEUDO: 'No adeudo', NO_REGISTRO: 'No registro' };

function titularDe(tramite: TramiteParaExportar): string {
  return tramite.personas.find((p) => p.rol === 'TITULAR')?.persona.nombreRazonSocial ?? '';
}

/** Domicilio sólo aplica a No Registro; los segmentos ausentes se omiten, no se imprimen como "null". */
function domicilioDe(tramite: TramiteParaExportar): string {
  const partes = [tramite.domicilioCalle, tramite.domicilioNumero, tramite.domicilioColonia].filter(
    (parte): parte is string => Boolean(parte),
  );
  return partes.join(' ');
}

/** Genera el libro en memoria y lo serializa a Buffer. Filas y columnas fijas: es un reporte, no una hoja editable. */
export async function generarExportTramites(tramites: TramiteParaExportar[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'GSTS';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Trámites');
  hoja.columns = ENCABEZADOS.map((header) => ({ header, width: Math.max(header.length + 2, 14) }));
  hoja.getRow(1).font = { bold: true };

  for (const tramite of tramites) {
    hoja.addRow([
      tramite.numeroTramite,
      TIPO_CONSTANCIA[tramite.tipoConstancia] ?? tramite.tipoConstancia,
      tramite.estado,
      titularDe(tramite),
      tramite.nis ?? '',
      domicilioDe(tramite),
      tramite.cobro ? Number(tramite.cobro.montoBase) : '',
      tramite.cobro ? Number(tramite.cobro.montoFinal) : '',
      tramite.cobro?.formaPago ?? '',
      tramite.constancia?.folioUnico ?? '',
      tramite.constancia?.vigenciaInicio ?? '',
      tramite.constancia?.vigenciaFin ?? '',
      tramite.constancia ? (tramite.constancia.anulada ? 'Sí' : 'No') : '',
      tramite.createdAt,
    ]);
  }

  const filaVigenciaInicio = hoja.getColumn(11);
  const filaVigenciaFin = hoja.getColumn(12);
  const columnaCreado = hoja.getColumn(14);
  for (const columna of [filaVigenciaInicio, filaVigenciaFin, columnaCreado]) columna.numFmt = 'yyyy-mm-dd hh:mm';

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
