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

// Finanzas y Dirección ya no viven aquí: se trasladaron a la aplicación del
// sistema Finanzas, que corre aparte con su propio backend. Dirección consume
// los indicadores de SICEF vía `GET /direccion/metricas`.
export const MODULOS: Modulo[] = [
  { to: '/ventanilla', icon: 'assignment_ind', label: 'Ventanilla', roles: ['ventanilla'] },
  { to: '/administracion', icon: 'settings', label: 'Administración', roles: ['ti'] },
  { to: '/bitacora', icon: 'history', label: 'Bitácora', roles: ['ti'] },
];
