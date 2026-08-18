import type { EstadoTramite, TipoConstancia } from '@prisma/client';

/**
 * Cálculo puro de los indicadores del tablero de Dirección, separado del router
 * para poder probarlo sin base de datos. El router se limita a ejecutar las
 * agregaciones y a pasar los conteos aquí.
 */

export interface ConteosMetricas {
  /** Constancias emitidas dentro del periodo. */
  constanciasEmitidas: number;
  /** Trámites por estado, dentro del periodo (por fecha de creación). */
  porEstado: Array<{ estado: EstadoTramite; total: number }>;
  /** Serie mensual de constancias emitidas, por tipo. */
  serieMensual: Array<{ mes: string; tipo: TipoConstancia; total: number }>;
  /** Trámites que alcanzaron APROBADO alguna vez (denominador de «vencidos sin pago»). */
  tramitesAprobados: number;
  /** Trámites en EXPIRADO: aprobados que vencieron sin cobrarse. */
  tramitesExpirados: number;
  /** Trámites con al menos una consulta a la concesionaria. */
  tramitesConConsulta: number;
  /** Total de trámites del periodo (denominador de «consultas a concesionaria»). */
  tramitesTotales: number;
  /** Revalidaciones de cobro que salieron CON_ADEUDO. */
  revalidacionesFallidas: number;
  /** Revalidaciones de cobro realizadas (denominador). */
  revalidacionesTotales: number;
  /** Cobros con motivo de reducción aplicado. */
  cobrosConReduccion: number;
  /** Cobros del periodo (denominador de «con reducción»). */
  cobrosTotales: number;
  /** Milisegundos acumulados entre creación y finalización, y cuántos trámites suman. */
  atencionMsAcumulados: number;
  atencionMuestras: number;
}

export interface Kpi {
  clave: string;
  etiqueta: string;
  valor: number;
  unidad: 'CONTEO' | 'PORCENTAJE' | 'MINUTOS';
}

/** Porcentaje con dos decimales; 0 cuando no hay denominador, nunca NaN. */
export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((parte / total) * 100).toFixed(2));
}

export function calcularKpis(c: ConteosMetricas): Kpi[] {
  return [
    { clave: 'CONSTANCIAS_EMITIDAS', etiqueta: 'Constancias emitidas', valor: c.constanciasEmitidas, unidad: 'CONTEO' },
    {
      clave: 'TIEMPO_PROMEDIO_ATENCION',
      etiqueta: 'Tiempo promedio de atención',
      valor: c.atencionMuestras > 0 ? Number((c.atencionMsAcumulados / c.atencionMuestras / 60_000).toFixed(1)) : 0,
      unidad: 'MINUTOS',
    },
    { clave: 'VENCIDOS_SIN_PAGO', etiqueta: 'Vencidos sin pago', valor: porcentaje(c.tramitesExpirados, c.tramitesAprobados), unidad: 'PORCENTAJE' },
    { clave: 'CONSULTAS_CONCESIONARIA', etiqueta: 'Consultas a concesionaria', valor: porcentaje(c.tramitesConConsulta, c.tramitesTotales), unidad: 'PORCENTAJE' },
    { clave: 'REVALIDACION_FALLIDA', etiqueta: 'Revalidación fallida', valor: porcentaje(c.revalidacionesFallidas, c.revalidacionesTotales), unidad: 'PORCENTAJE' },
    { clave: 'CON_REDUCCION', etiqueta: 'Con reducción de costo', valor: porcentaje(c.cobrosConReduccion, c.cobrosTotales), unidad: 'PORCENTAJE' },
  ];
}

/**
 * Reordena la serie plana que devuelve SQL a la forma que consume un gráfico:
 * una lista de meses y una serie por tipo de constancia, alineadas por índice.
 */
export function armarSerieMensual(filas: ConteosMetricas['serieMensual']): {
  meses: string[];
  series: Array<{ tipo: TipoConstancia; valores: number[] }>;
} {
  const meses = [...new Set(filas.map((f) => f.mes))].sort();
  const tipos = [...new Set(filas.map((f) => f.tipo))].sort();
  return {
    meses,
    series: tipos.map((tipo) => ({
      tipo,
      valores: meses.map((mes) => filas.find((f) => f.mes === mes && f.tipo === tipo)?.total ?? 0),
    })),
  };
}
