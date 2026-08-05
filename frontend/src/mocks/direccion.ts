// DATOS DE DEMOSTRACIÓN — no existe endpoint de métricas para Dirección.
// Ver documentacion/PENDIENTES_BACKEND_FRONTEND.md.

export const DIR_KPIS = [
  { icon: 'description', label: 'Constancias emitidas', value: '1,284', delta: '+6.1%', positiva: true },
  { icon: 'timer', label: 'Tiempo prom. atención', value: '11 min', delta: '-1.4', positiva: true },
  { icon: 'task_alt', label: 'Éxito de timbrado', value: '97.3%', delta: '+0.8%', positiva: true },
  { icon: 'event_busy', label: 'Vencidos sin pago', value: '4.1%', delta: '-0.6', positiva: true },
  { icon: 'support_agent', label: 'Consultas concesionaria', value: '8.6%', delta: '+1.2', positiva: false },
  { icon: 'restart_alt', label: 'Revalidación fallida', value: '1.4%', delta: '=', positiva: true },
  { icon: 'sell', label: 'Con reducción de costo', value: '3.2%', delta: '+0.4', positiva: true },
  { icon: 'cancel', label: 'Cancelaciones CFDI', value: '0.9%', delta: '-0.2', positiva: true },
] as const;

// Serie mensual 2026 (ene–jun): constancias por tipo.
export const CONSTANCIAS_POR_MES = {
  meses: ['ene', 'feb', 'mar', 'abr', 'may', 'jun'],
  noAdeudo: [686, 735, 784, 752, 847, 899],
  noRegistro: [294, 315, 336, 323, 363, 385],
} as const;

export const TRAMITES_POR_ESTADO = [
  { etiqueta: 'Finalizado', valor: 1180, color: '#2E7D32' },
  { etiqueta: 'Rechazado', valor: 74, color: '#BA1A1A' },
  { etiqueta: 'En validación', valor: 62, color: '#1565C0' },
  { etiqueta: 'Expirado', valor: 41, color: '#C58A00' },
] as const;
