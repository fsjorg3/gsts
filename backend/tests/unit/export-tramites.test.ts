import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { generarExportTramites, type TramiteParaExportar } from '../../src/modules/constancias/tramites/export.js';

// Construye sólo los campos que generarExportTramites realmente lee: un mock
// completo del payload de Prisma (Tramite + personas.persona + cobro +
// constancia) sería frágil ante cualquier cambio de schema ajeno a este
// mapeo. `as unknown as` es deliberado: el objetivo es fijar el contrato de
// columnas del XLSX, no replicar el tipo generado por Prisma.
function tramite(overrides: Partial<TramiteParaExportar> & Record<string, unknown> = {}): TramiteParaExportar {
  return {
    numeroTramite: 2038,
    tipoConstancia: 'NO_ADEUDO',
    estado: 'FINALIZADO',
    nis: '12345',
    domicilioCalle: null,
    domicilioNumero: null,
    domicilioColonia: null,
    personas: [{ rol: 'TITULAR', persona: { nombreRazonSocial: 'Juana Pérez López' } }],
    cobro: null,
    constancia: null,
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    ...overrides,
  } as unknown as TramiteParaExportar;
}

/** Lee de vuelta el buffer generado, como haría quien abre el XLSX. */
async function leerHoja(buffer: Buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  const hoja = libro.getWorksheet('Trámites');
  if (!hoja) throw new Error('No se generó la hoja "Trámites"');
  return hoja;
}

function valoresFila(hoja: ExcelJS.Worksheet, numeroFila: number): unknown[] {
  const fila = hoja.getRow(numeroFila);
  const valores: unknown[] = [];
  fila.eachCell({ includeEmpty: true }, (celda) => valores.push(celda.value));
  return valores;
}

describe('generarExportTramites', () => {
  it('escribe una fila por trámite y conserva el encabezado', async () => {
    const hoja = await leerHoja(await generarExportTramites([tramite(), tramite({ numeroTramite: 2039 })]));
    expect(hoja.rowCount).toBe(3); // encabezado + 2 filas
    expect(valoresFila(hoja, 1)).toEqual([
      'Número de trámite', 'Tipo de constancia', 'Estado', 'Titular', 'NIS', 'Domicilio',
      'Monto base', 'Monto final', 'Forma de pago', 'Folio de constancia',
      'Vigencia inicio', 'Vigencia fin', 'Anulada', 'Creado',
    ]);
  });

  it('resuelve el titular por rol TITULAR, no por el primero de la lista', async () => {
    const hoja = await leerHoja(
      await generarExportTramites([
        tramite({
          personas: [
            { rol: 'REPRESENTANTE', persona: { nombreRazonSocial: 'Apoderado Legal SA' } },
            { rol: 'TITULAR', persona: { nombreRazonSocial: 'Juan Titular' } },
          ],
        }),
      ]),
    );
    expect(valoresFila(hoja, 2)[3]).toBe('Juan Titular');
  });

  it('concatena el domicilio omitiendo segmentos ausentes, sin literal "null"', async () => {
    const hoja = await leerHoja(
      await generarExportTramites([tramite({ domicilioCalle: 'Reforma', domicilioNumero: null, domicilioColonia: 'Centro' })]),
    );
    expect(valoresFila(hoja, 2)[5]).toBe('Reforma Centro');
  });

  it('trámites sin cobro ni constancia dejan esas columnas vacías, no en cero', async () => {
    const hoja = await leerHoja(await generarExportTramites([tramite({ cobro: null, constancia: null })]));
    const fila = valoresFila(hoja, 2);
    expect(fila[6]).toBe(''); // monto base
    expect(fila[7]).toBe(''); // monto final
    expect(fila[9]).toBe(''); // folio de constancia
  });

  it('vuelca los montos Decimal de Prisma como número, no como string', async () => {
    const hoja = await leerHoja(
      await generarExportTramites([
        tramite({ cobro: { montoBase: { toString: () => '186.00' }, montoFinal: { toString: () => '150.00' }, formaPago: '01' } }),
      ]),
    );
    const fila = valoresFila(hoja, 2);
    expect(fila[6]).toBe(186);
    expect(fila[7]).toBe(150);
    expect(fila[8]).toBe('01');
  });

  it('traduce el enum de tipoConstancia y refleja si la constancia está anulada', async () => {
    const hoja = await leerHoja(
      await generarExportTramites([
        tramite({
          tipoConstancia: 'NO_REGISTRO',
          constancia: {
            folioUnico: 'GSTS-2038-ABCD1234',
            vigenciaInicio: new Date('2026-01-01T00:00:00.000Z'),
            vigenciaFin: new Date('2026-12-31T00:00:00.000Z'),
            anulada: true,
          },
        }),
      ]),
    );
    const fila = valoresFila(hoja, 2);
    expect(fila[1]).toBe('No registro');
    expect(fila[9]).toBe('GSTS-2038-ABCD1234');
    expect(fila[12]).toBe('Sí');
  });
});
