import { describe, expect, it } from 'vitest';
import { armarSerieMensual, calcularKpis, porcentaje, type ConteosMetricas } from '../../src/modules/constancias/direccion/metricas.js';

const CONTEOS_BASE: ConteosMetricas = {
  constanciasEmitidas: 0,
  porEstado: [],
  serieMensual: [],
  tramitesAprobados: 0,
  tramitesExpirados: 0,
  tramitesConConsulta: 0,
  tramitesTotales: 0,
  revalidacionesFallidas: 0,
  revalidacionesTotales: 0,
  cobrosConReduccion: 0,
  cobrosTotales: 0,
  atencionMsAcumulados: 0,
  atencionMuestras: 0,
};

const valorDe = (kpis: ReturnType<typeof calcularKpis>, clave: string) => kpis.find((k) => k.clave === clave)?.valor;

describe('porcentaje', () => {
  it('redondea a dos decimales', () => {
    expect(porcentaje(1, 3)).toBe(33.33);
  });

  it('devuelve 0 sin denominador en vez de NaN', () => {
    // Un tablero con datos vacíos no debe mostrar NaN%.
    expect(porcentaje(0, 0)).toBe(0);
    expect(porcentaje(5, 0)).toBe(0);
  });
});

describe('calcularKpis', () => {
  it('calcula cada proporción contra su propio denominador', () => {
    const kpis = calcularKpis({
      ...CONTEOS_BASE,
      constanciasEmitidas: 1284,
      tramitesAprobados: 1000,
      tramitesExpirados: 41,
      tramitesTotales: 500,
      tramitesConConsulta: 43,
      revalidacionesTotales: 200,
      revalidacionesFallidas: 3,
      cobrosTotales: 250,
      cobrosConReduccion: 8,
    });

    expect(valorDe(kpis, 'CONSTANCIAS_EMITIDAS')).toBe(1284);
    expect(valorDe(kpis, 'VENCIDOS_SIN_PAGO')).toBe(4.1);
    expect(valorDe(kpis, 'CONSULTAS_CONCESIONARIA')).toBe(8.6);
    expect(valorDe(kpis, 'REVALIDACION_FALLIDA')).toBe(1.5);
    expect(valorDe(kpis, 'CON_REDUCCION')).toBe(3.2);
  });

  it('promedia el tiempo de atención en minutos', () => {
    const kpis = calcularKpis({ ...CONTEOS_BASE, atencionMsAcumulados: 33 * 60_000, atencionMuestras: 3 });
    expect(valorDe(kpis, 'TIEMPO_PROMEDIO_ATENCION')).toBe(11);
  });

  it('no divide por cero cuando no hubo trámites finalizados', () => {
    const kpis = calcularKpis(CONTEOS_BASE);
    expect(valorDe(kpis, 'TIEMPO_PROMEDIO_ATENCION')).toBe(0);
  });

  it('expone seis indicadores: los dos fiscales son del sistema Finanzas', () => {
    const claves = calcularKpis(CONTEOS_BASE).map((k) => k.clave);
    expect(claves).toHaveLength(6);
    expect(claves).not.toContain('EXITO_TIMBRADO');
    expect(claves).not.toContain('CANCELACIONES_CFDI');
  });
});

describe('armarSerieMensual', () => {
  it('alinea cada tipo con la lista de meses y rellena los huecos con 0', () => {
    const serie = armarSerieMensual([
      { mes: '2026-02', tipo: 'NO_REGISTRO', total: 315 },
      { mes: '2026-01', tipo: 'NO_ADEUDO', total: 686 },
      { mes: '2026-02', tipo: 'NO_ADEUDO', total: 735 },
    ]);

    expect(serie.meses).toEqual(['2026-01', '2026-02']);
    expect(serie.series).toEqual([
      { tipo: 'NO_ADEUDO', valores: [686, 735] },
      // Enero no tuvo NO_REGISTRO: la serie debe traer 0, no omitir el punto,
      // o el gráfico desalinearía las dos líneas.
      { tipo: 'NO_REGISTRO', valores: [0, 315] },
    ]);
  });

  it('devuelve series vacías sin datos', () => {
    expect(armarSerieMensual([])).toEqual({ meses: [], series: [] });
  });
});
