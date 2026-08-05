// Nota: en el frontend (Vite, moduleResolution bundler) los imports van sin
// extensión, a diferencia del backend (NodeNext, extensión .js obligatoria).
export { MsIcon } from './MsIcon';
export {
  EstadoBadge,
  EstadoDeBadge,
  ESTADO_TRAMITE,
  ESTADO_FACTURA,
  ESTADO_BORRADOR,
  ESTADO_EVIDENCIA,
  ESTADO_SOLICITUD_FACTURA,
  type BadgeColor,
} from './EstadoBadge';
export { DataTable, type DataTableColumn } from './DataTable';
export { StatCard } from './StatCard';
