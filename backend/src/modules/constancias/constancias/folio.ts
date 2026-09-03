import { Prisma, type TipoConstancia } from '@prisma/client';

/**
 * Código impreso por tipo de constancia dentro del folio. Mapa fijo, no
 * derivado de ningún campo de configuración: si se agrega un tipo o cambia
 * el código impreso, se edita aquí a mano.
 */
const CODIGO_TIPO_CONSTANCIA: Record<TipoConstancia, string> = {
  NO_ADEUDO: 'CNA',
  NO_REGISTRO: 'CNR',
};

/**
 * Año en la zona horaria de Puebla — mismo criterio que formatearFechaLarga
 * en plantillas/formato.ts: evita que el consecutivo cambie de año unas
 * horas antes de tiempo por la diferencia con UTC la noche del 31 de
 * diciembre.
 */
function anioPuebla(fecha: Date): number {
  return Number(new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric' }).format(fecha));
}

/**
 * Reserva el consecutivo y arma el folio único de una constancia, dentro de
 * la misma transacción que la persiste: el UPSERT es atómico (Postgres
 * serializa los UPDATE concurrentes sobre la misma fila, así que nunca hay
 * duplicados) y, al vivir en esa transacción, un rollback posterior libera
 * el número — así tampoco hay huecos. Una SEQUENCE de Postgres evitaría los
 * duplicados pero no los huecos, porque su avance no es transaccional.
 *
 * El contador es independiente por (tipoConstancia, año en Puebla): cada
 * combinación tiene su propia fila en contador_folio, con id
 * "{tipoConstancia}_{año}", y reinicia en 1 cada año natural. El folio
 * resultante sólo usa guiones (nunca "/"): es segmento de ruta en
 * GET /public/constancias/{folio}/verificar/{token} y en las rutas de sólo
 * lectura hacia Finanzas, y una "/" literal ahí es frágil detrás de proxies
 * incluso percent-encoded.
 */
export async function generarFolioUnico(tx: Prisma.TransactionClient, tipoConstancia: TipoConstancia, emitidaAt: Date): Promise<string> {
  const anio = anioPuebla(emitidaAt);
  const idContador = `${tipoConstancia}_${anio}`;

  const filas = await tx.$queryRaw<{ valor: number }[]>(Prisma.sql`
    INSERT INTO contador_folio (id, valor, updated_at)
    VALUES (${idContador}, 1, now())
    ON CONFLICT (id) DO UPDATE SET valor = contador_folio.valor + 1, updated_at = now()
    RETURNING valor
  `);
  const fila = filas[0];
  if (!fila) throw new Error('No se pudo reservar el consecutivo del folio');

  return `GSTS-${CODIGO_TIPO_CONSTANCIA[tipoConstancia]}-${anio}-${fila.valor}`;
}
