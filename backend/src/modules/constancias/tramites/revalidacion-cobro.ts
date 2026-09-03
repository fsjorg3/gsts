/**
 * Espeja en TS la misma fórmula que `fn_tramite_transicion_valida` aplica en
 * el bloque APROBADO→COBRO (migration_complementaria.sql): sin ancla confiable
 * (`aprobadoEn` nulo) o fuera de la ventana de gracia, se exige revalidación.
 * Sólo es significativo mientras el trámite está en APROBADO.
 */
export interface ParametrosRevalidacionCobro {
  estado: string;
  aprobadoEn: Date | null;
  graciaMinutos: number;
  configuracionActiva: boolean;
}

export function calcularRequiereRevalidacionCobro(
  parametros: ParametrosRevalidacionCobro,
  ahora: Date = new Date(),
): boolean {
  if (parametros.estado !== 'APROBADO') return false;
  if (parametros.aprobadoEn === null) return true;
  const graciaMinutos = parametros.configuracionActiva ? parametros.graciaMinutos : 0;
  const limiteGracia = parametros.aprobadoEn.getTime() + graciaMinutos * 60_000;
  // Ventana [aprobadoEn, aprobadoEn+gracia): con gracia en 0 se exige siempre,
  // incluso en un empate exacto (>=, no >).
  return ahora.getTime() >= limiteGracia;
}
