import { describe, expect, it } from 'vitest';
import { parse } from 'csv-parse/sync';
import { construirDatosPadron, type FilaPadronCsv } from '../../src/modules/constancias/padron/normalizar.js';

// Formato acordado del extracto (Fase 0): 11 columnas, comillas para valores
// con coma interna (nombres "APELLIDO, NOMBRE") como los trae el padrón real.
const CSV = [
  'NIS,FECHA_CONTRATO,PROPIETARIO,TITULAR DE PAGO,VIA,CALLE,NUMERO,DUPLICADOR,NUMERO_INTERIOR,MUNICIPIO,COLONIA',
  '2164542,17/02/1999,"CANIZALES, JAIME",,CALLE,PLAZA B M 6,4,D-1,B,PUEBLA,INFONAVIT SAN JORGE',
  '546086,06/12/2023,AL PROPIETARIO DEL PREDIO,"PEREZ GUERRERO, SANDRA",CALLE,MIRASOLES,9,LOTE MANZANA 2,0,PUEBLA,BARRANCA HONDA',
].join('\n');

describe('parseo del extracto CSV del padrón', () => {
  it('respeta comas dentro de comillas y expone las columnas por nombre', () => {
    const filas = parse(CSV, { columns: true, skip_empty_lines: true, bom: true }) as FilaPadronCsv[];
    expect(filas).toHaveLength(2);
    expect(filas[0]?.NIS).toBe('2164542');
    expect(filas[0]?.PROPIETARIO).toBe('CANIZALES, JAIME');
    expect(filas[1]?.['TITULAR DE PAGO']).toBe('PEREZ GUERRERO, SANDRA');
  });

  it('las filas parseadas son consumibles por construirDatosPadron', () => {
    const filas = parse(CSV, { columns: true, skip_empty_lines: true, bom: true }) as FilaPadronCsv[];
    const [primera, segunda] = filas;
    expect(primera && construirDatosPadron(primera).propietario).toBe('CANIZALES, JAIME');
    expect(segunda && construirDatosPadron(segunda).propietario).toBe('AL PROPIETARIO DEL PREDIO');
  });
});
