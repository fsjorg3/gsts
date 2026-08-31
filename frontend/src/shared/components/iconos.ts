// Registro único de la iconografía del design system.
//
// La app no embebe la fuente completa de Material Symbols (4.9 MB, ~3 700
// iconos): `scripts/subset-iconos.mjs` genera un subconjunto con exactamente
// estos nombres. Por eso la lista es la fuente de verdad y `MsIcon` la exige
// por tipo: un icono que no esté aquí es un error de compilación, no un
// cuadrito vacío en producción.
//
// Al agregar un icono: añadirlo a esta lista y correr `npm run gen:iconos`.
export const ICONOS = [
  'add',
  'arrow_back',
  'assignment_ind',
  'block',
  'check',
  'check_circle',
  'chevron_left',
  'chevron_right',
  'close',
  'delete',
  'description',
  'done_all',
  'download',
  'edit',
  'error',
  'expand_more',
  'fact_check',
  'folder_open',
  'folder_zip',
  'gavel',
  'groups',
  'history',
  'home',
  'info',
  'key_off',
  'lock',
  'logout',
  'map',
  'menu',
  'payments',
  'pending_actions',
  'person_add',
  'plumbing',
  'print',
  'public',
  'radio_button_unchecked',
  'receipt',
  'receipt_long',
  'refresh',
  'restart_alt',
  'save',
  'schedule',
  'search_off',
  'send',
  'settings',
  'shield',
  'summarize',
  'task_alt',
  'timer_off',
  'upload',
  'verified',
  'visibility',
  'warning',
  'water_drop',
  'workspace_premium',
] as const;

export type IconoNombre = (typeof ICONOS)[number];
