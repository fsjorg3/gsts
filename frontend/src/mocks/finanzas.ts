// DATOS DE DEMOSTRACIÓN — el backend aún no expone GET de solicitudes/facturas
// ni el worker PAC existe. Ver documentacion/PENDIENTES_BACKEND_FRONTEND.md.

export interface FacturaDemo {
  id: string;
  folioConstancia: string;
  receptorNombre: string;
  receptorRfc: string;
  receptorCp: string;
  receptorRegimen: string;
  usoCfdi: string;
  monto: string;
  estado: 'TIMBRADO' | 'TIMBRADO_EN_PROCESO' | 'TIMBRADO_FALLIDO';
  errorPac?: { codigo: string; mensaje: string };
}

export const FIN_KPIS = [
  { icon: 'task_alt', color: '#2E7D32', label: 'Timbrados exitosos', value: '2' },
  { icon: 'progress_activity', color: '#1565C0', label: 'En proceso', value: '1' },
  { icon: 'error', color: '#BA1A1A', label: 'Fallidos', value: '1' },
  { icon: 'percent', color: '#9F7122', label: 'Tasa de éxito', value: '97.3%' },
] as const;

export const FACTURAS_DEMO: FacturaDemo[] = [
  {
    id: 'demo-1',
    folioConstancia: 'NA-2026-02038',
    receptorNombre: 'María González Reyes',
    receptorRfc: 'GORM850312AB1',
    receptorCp: '72000',
    receptorRegimen: '612',
    usoCfdi: 'G03',
    monto: '186.00',
    estado: 'TIMBRADO',
  },
  {
    id: 'demo-2',
    folioConstancia: 'NR-2026-02039',
    receptorNombre: 'Constructora Angelópolis SA de CV',
    receptorRfc: 'CAN180420QK3',
    receptorCp: '72830',
    receptorRegimen: '601',
    usoCfdi: 'G03',
    monto: '248.00',
    estado: 'TIMBRADO_FALLIDO',
    errorPac: {
      codigo: 'CFDI40120',
      mensaje: 'El nombre del receptor no coincide con la Constancia de Situación Fiscal registrada en el SAT.',
    },
  },
  {
    id: 'demo-3',
    folioConstancia: 'NA-2026-02036',
    receptorNombre: 'Juan Pérez Salinas',
    receptorRfc: 'PESJ790101HT4',
    receptorCp: '72400',
    receptorRegimen: '605',
    usoCfdi: 'S01',
    monto: '186.00',
    estado: 'TIMBRADO_EN_PROCESO',
  },
];
