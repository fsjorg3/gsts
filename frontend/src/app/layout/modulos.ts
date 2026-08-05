import type { RolSicef } from '@/auth/useAuth';

// Fuente única de los módulos del sidebar: AppShell filtra qué NavItem se
// renderiza y el router usa el mismo orden para decidir a dónde redirigir la
// ruta índice según el rol del usuario autenticado.
export interface Modulo {
  to: string;
  icon: string;
  label: string;
  roles: RolSicef[];
}

export const MODULOS: Modulo[] = [
  { to: '/ventanilla', icon: 'assignment_ind', label: 'Ventanilla', roles: ['ventanilla'] },
  { to: '/finanzas', icon: 'payments', label: 'Finanzas', roles: ['finanzas'] },
  { to: '/direccion', icon: 'monitoring', label: 'Dirección', roles: ['direccion'] },
  { to: '/administracion', icon: 'settings', label: 'Administración', roles: ['ti'] },
  { to: '/bitacora', icon: 'history', label: 'Bitácora', roles: ['ti'] },
];
