import type { Prisma } from '@prisma/client';

// El folio de presentación (NA-2026-02038) no es una columna: el frontend lo
// arma con tipoConstancia + año de createdAt + numeroTramite. Para buscarlo hay
// que descomponerlo en esas tres partes.
//
// Se admiten folios por segmentos, no dígitos truncados: `NA-2026-02038`,
// `NA-2026`, `NA`, o sólo el número (`2038` / `02038`). numeroTramite es
// autoincrement global y único —no reinicia por año ni por tipo—, así que el
// número por sí solo ya identifica el trámite.
//
// Por eso, **cuando el folio trae número el segmento de año se ignora**: el año
// impreso sale de getFullYear() del navegador (hora local) y aquí sólo se puede
// acotar createdAt en UTC. Un trámite creado el 31-dic 20:00 CST se imprime con
// el año anterior al que tiene en UTC; exigir ambos no devolvería nada. El año
// sólo acota cuando no hay número.

const PREFIJOS = { NA: 'NO_ADEUDO', NR: 'NO_REGISTRO' } as const;

const esPrefijo = (token: string): token is keyof typeof PREFIJOS =>
  Object.hasOwn(PREFIJOS, token);

/** Rango [inicio, fin) del año en UTC. */
function rangoDelAnio(anio: number): Prisma.DateTimeFilter {
  return { gte: new Date(Date.UTC(anio, 0, 1)), lt: new Date(Date.UTC(anio + 1, 0, 1)) };
}

/**
 * Traduce un folio (completo o por segmentos) al `where` que lo localiza.
 * Devuelve `null` si no se reconoce nada útil — el llamador debe rechazar la
 * consulta, nunca degradarla a un listado sin filtrar.
 */
export function whereDeFolio(folio: string): Prisma.TramiteWhereInput | null {
  const tokens = folio.trim().toUpperCase().split('-').filter((t) => t !== '');
  if (tokens.length === 0) return null;

  const primero = tokens[0];
  const tipoConstancia = primero !== undefined && esPrefijo(primero) ? PREFIJOS[primero] : undefined;
  const numeros = tipoConstancia ? tokens.slice(1) : tokens;
  if (numeros.length > 2 || !numeros.every((token) => /^\d+$/.test(token))) return null;

  // Tras el prefijo los segmentos son, en orden, [año, número]. Con los dos
  // presentes no hay ambigüedad. Con uno solo, es año únicamente si viene el
  // prefijo y tiene forma de año (`NA-2026`): el número se imprime con cinco
  // dígitos, así que `NA-02038` sigue siendo un número. Sin prefijo, dígitos
  // sueltos son siempre el número — es lo que se copia del folio a mano.
  let anio: number | undefined;
  let numeroTramite: number | undefined;
  if (numeros.length === 2) {
    const [tokenAnio, tokenNumero] = numeros as [string, string];
    if (!/^(19|20)\d{2}$/.test(tokenAnio)) return null;
    anio = Number(tokenAnio);
    numeroTramite = Number(tokenNumero);
  } else if (numeros.length === 1) {
    const token = numeros[0] as string;
    if (tipoConstancia && /^(19|20)\d{2}$/.test(token)) anio = Number(token);
    else numeroTramite = Number(token);
  }

  if (tipoConstancia === undefined && anio === undefined && numeroTramite === undefined) return null;

  return {
    ...(tipoConstancia ? { tipoConstancia } : {}),
    ...(numeroTramite !== undefined ? { numeroTramite } : {}),
    ...(numeroTramite === undefined && anio !== undefined ? { createdAt: rangoDelAnio(anio) } : {}),
  };
}
