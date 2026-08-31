// Nota: en el frontend (Vite, moduleResolution bundler) los imports van sin
// extensión, a diferencia del backend (NodeNext, extensión .js obligatoria).
export { MsIcon } from './MsIcon';
export { ICONOS, type IconoNombre } from './iconos';
export {
  EstadoBadge,
  EstadoDeBadge,
  ESTADO_TRAMITE,
  ESTADO_BORRADOR,
  ESTADO_EVIDENCIA,
  type BadgeColor,
} from './EstadoBadge';
export { DataTable, type DataTableColumn, type DataTablePaginacion } from './DataTable';
export { StatCard } from './StatCard';
export { ConfirmDialog } from './ConfirmDialog';
