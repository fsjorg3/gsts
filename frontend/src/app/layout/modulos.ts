import type { RolGsts } from '@/auth/useAuth';

// Fuente única de los módulos del sidebar: AppShell filtra qué NavItem se
// renderiza y el router usa el mismo orden para decidir a dónde redirigir la
// ruta índice según el rol del usuario autenticado.
export interface Modulo {
  to: string;
  icon: string;
  label: string;
  roles: RolGsts[];
  /**
   * Dominio de GSTS al que pertenece el módulo. El sidebar agrupa por este
   * campo: hoy todo es Constancias, y un dominio nuevo (p. ej. Quejas) sólo
   * agrega entradas con otra sección, sin tocar AppShell.
   */
  seccion: string;
}

// Finanzas y Dirección ya no viven aquí: se trasladaron a la aplicación del
// sistema Finanzas, que corre aparte con su propio backend. Dirección consume
// los indicadores de GSTS vía `GET /direccion/metricas`.
export const MODULOS: Modulo[] = [
  { to: '/ventanilla', icon: 'assignment_ind', label: 'Ventanilla', roles: ['ventanilla'], seccion: 'Constancias' },
  { to: '/administracion', icon: 'settings', label: 'Administración', roles: ['ti'], seccion: 'Constancias' },
  { to: '/bitacora', icon: 'history', label: 'Bitácora', roles: ['ti'], seccion: 'Constancias' },
];

export interface SeccionModulos {
  label: string;
  modulos: Modulo[];
}

/**
 * Agrupa módulos por sección preservando el orden de aparición en `MODULOS`
 * (tanto el de las secciones como el de los módulos dentro de cada una).
 * Recibe la lista ya filtrada por rol, así que una sección sin módulos
 * visibles simplemente no aparece.
 */
export function seccionesDe(modulos: Modulo[]): SeccionModulos[] {
  const secciones: SeccionModulos[] = [];
  for (const modulo of modulos) {
    const existente = secciones.find((s) => s.label === modulo.seccion);
    if (existente) existente.modulos.push(modulo);
    else secciones.push({ label: modulo.seccion, modulos: [modulo] });
  }
  return secciones;
}
