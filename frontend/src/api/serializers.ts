// Formato de alambre → presentación. Reglas del contrato y del design system:
// - Montos llegan como string (Prisma Decimal); NUNCA convertir a number para
//   operar — sólo para formatear. El backend calcula montoFinal.
// - Pesos mexicanos: $1,234.00. Fechas: "30 jun 2026" (mes abreviado minúscula).

const formatoMxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

/** Formatea un monto string del backend como pesos: "186" → "$186.00". */
export function formatMxn(monto: string | null | undefined): string {
  if (monto === null || monto === undefined || monto === '') return '—';
  const valor = Number(monto);
  if (Number.isNaN(valor)) return monto;
  return formatoMxn.format(valor);
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** "2026-06-30T12:00:00.000Z" → "30 jun 2026" (regla del design system). */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/** Fecha con hora local: "30 jun 2026 · 14:05". */
export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${formatFecha(iso)} · ${hh}:${mm}`;
}

/** Bytes → etiqueta legible ("12.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
