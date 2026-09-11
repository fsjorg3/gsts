import { describe, expect, it } from 'vitest';
import {
  clasificarFilaPadron,
  construirDatosPadron,
  normalizarDomicilio,
  parsearFechaContrato,
  resolverNombreSugerido,
  type FilaPadronCsv,
} from '../../src/modules/constancias/padron/normalizar.js';

function fila(overrides: Partial<FilaPadronCsv> = {}): FilaPadronCsv {
  return {
    NIS: '2164542',
    FECHA_CONTRATO: '17/02/1999',
    PROPIETARIO: 'CANIZALES, JAIME',
    'TITULAR DE PAGO': '',
    VIA: 'CALLE',
    CALLE: 'PLAZA B M 6',
    NUMERO: '4',
    DUPLICADOR: 'D-1',
    NUMERO_INTERIOR: 'B',
    MUNICIPIO: 'PUEBLA',
    COLONIA: 'INFONAVIT SAN JORGE',
    ...overrides,
  };
}

describe('resolverNombreSugerido', () => {
  it('devuelve null cuando el propietario es el valor genérico del padrón', () => {
    expect(resolverNombreSugerido('AL PROPIETARIO DEL PREDIO')).toBeNull();
  });

  it('es insensible a mayúsculas/espacios al detectar el valor genérico', () => {
    expect(resolverNombreSugerido('  al propietario del predio  ')).toBeNull();
  });

  it('devuelve el nombre recortado cuando no es el valor genérico', () => {
    expect(resolverNombreSugerido('  CANIZALES, JAIME  ')).toBe('CANIZALES, JAIME');
  });
});

describe('normalizarDomicilio', () => {
  it('combina VIA y CALLE, y pliega duplicador/interior en el número', () => {
    const domicilio = normalizarDomicilio(fila());
    expect(domicilio.calle).toBe('CALLE PLAZA B M 6');
    expect(domicilio.numero).toBe('4 INT. B D-1');
    expect(domicilio.colonia).toBe('INFONAVIT SAN JORGE');
  });

  it('trata "0" y vacío como ausencia de interior/duplicador', () => {
    const domicilio = normalizarDomicilio(fila({ NUMERO_INTERIOR: '0', DUPLICADOR: '' }));
    expect(domicilio.numero).toBe('4');
  });

  it('no agrega perteneceA/perteneceANombre cuando el municipio es Puebla', () => {
    const domicilio = normalizarDomicilio(fila({ MUNICIPIO: 'PUEBLA' }));
    expect(domicilio.perteneceA).toBeNull();
    expect(domicilio.perteneceANombre).toBeNull();
  });

  it('marca perteneceA=MUNICIPIO cuando el municipio no es Puebla', () => {
    const domicilio = normalizarDomicilio(fila({ MUNICIPIO: 'SAN ANDRES CHOLULA' }));
    expect(domicilio.perteneceA).toBe('MUNICIPIO');
    expect(domicilio.perteneceANombre).toBe('SAN ANDRES CHOLULA');
  });
});

describe('parsearFechaContrato', () => {
  it('parsea dd/mm/aaaa como fecha UTC', () => {
    const fecha = parsearFechaContrato('17/02/1999');
    expect(fecha?.toISOString()).toBe('1999-02-17T00:00:00.000Z');
  });

  it('devuelve null para vacío o formato irreconocible', () => {
    expect(parsearFechaContrato('')).toBeNull();
    expect(parsearFechaContrato('no-es-fecha')).toBeNull();
    expect(parsearFechaContrato('31/13/2020')).toBeNull();
  });

  it('devuelve null para un día que no existe en ese mes, en vez de desbordar al mes siguiente', () => {
    // Date.UTC(2020, 1, 31) no falla: normaliza a 2 de marzo. Sin la
    // revalidación de componentes esto se colaría como fecha válida.
    expect(parsearFechaContrato('31/02/2020')).toBeNull();
  });
});

describe('construirDatosPadron', () => {
  it('arma la fila lista para upsert con origen IMPORTADO', () => {
    const datos = construirDatosPadron(fila());
    expect(datos.origen).toBe('IMPORTADO');
    expect(datos.propietario).toBe('CANIZALES, JAIME');
    expect(datos.titularPago).toBeNull();
    expect(datos.domicilioCalle).toBe('CALLE PLAZA B M 6');
  });

  it('convierte TITULAR DE PAGO vacío a null, no a cadena vacía', () => {
    expect(construirDatosPadron(fila({ 'TITULAR DE PAGO': '   ' })).titularPago).toBeNull();
    expect(construirDatosPadron(fila({ 'TITULAR DE PAGO': 'PEREZ GUERRERO, SANDRA' })).titularPago).toBe('PEREZ GUERRERO, SANDRA');
  });
});

describe('clasificarFilaPadron', () => {
  it('clasifica como importado cuando no había fila previa o ya era IMPORTADO', () => {
    expect(clasificarFilaPadron(undefined)).toBe('importado');
    expect(clasificarFilaPadron('IMPORTADO')).toBe('importado');
  });

  it('clasifica como reclasificado cuando la fila previa era CAPTURADO_MANUAL', () => {
    expect(clasificarFilaPadron('CAPTURADO_MANUAL')).toBe('reclasificado');
  });
});
