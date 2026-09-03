import Chip from '@mui/material/Chip';

// Badge pill del design system: etiqueta de estado con tinte suave (soft) o
// sólido. Los colores semánticos y el mapeo de estados de negocio viven aquí
// para que toda la app pinte un estado de la misma manera.
export type BadgeColor = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'vino' | 'oro';

const SOFT: Record<BadgeColor, { bg: string; fg: string; border: string }> = {
  success: { bg: '#E8F5E9', fg: '#2E7D32', border: '#C8E6C9' },
  error: { bg: '#FFEBEE', fg: '#BA1A1A', border: '#F5C2C7' },
  warning: { bg: '#FFF7E0', fg: '#C58A00', border: '#F0D89A' },
  info: { bg: '#EAF2FD', fg: '#1565C0', border: '#C9DDF8' },
  neutral: { bg: '#F2F4F6', fg: '#544245', border: '#E9ECEF' },
  vino: { bg: '#F8F1F3', fg: '#5B132B', border: '#E9ECEF' },
  oro: { bg: '#FFF7E0', fg: '#9F7122', border: '#F0D89A' },
};

const SOLID: Record<BadgeColor, { bg: string; fg: string }> = {
  success: { bg: '#2E7D32', fg: '#FFFFFF' },
  error: { bg: '#BA1A1A', fg: '#FFFFFF' },
  warning: { bg: '#C58A00', fg: '#191C1E' },
  info: { bg: '#1565C0', fg: '#FFFFFF' },
  neutral: { bg: '#544245', fg: '#FFFFFF' },
  vino: { bg: '#3D0017', fg: '#FFFFFF' },
  oro: { bg: '#B8822A', fg: '#FFFFFF' },
};

export interface EstadoBadgeProps {
  label: string;
  color?: BadgeColor;
  variant?: 'soft' | 'solid';
  size?: 'small' | 'medium';
}

export function EstadoBadge({ label, color = 'neutral', variant = 'soft', size = 'small' }: EstadoBadgeProps) {
  const styles =
    variant === 'soft'
      ? { backgroundColor: SOFT[color].bg, color: SOFT[color].fg, border: `1px solid ${SOFT[color].border}` }
      : { backgroundColor: SOLID[color].bg, color: SOLID[color].fg, border: '1px solid transparent' };
  return <Chip label={label} size={size} sx={{ ...styles, fontWeight: 600, fontSize: 12 }} />;
}

// ---- Mapeos de estados de negocio → etiqueta y color del badge ----

type EstadoMap = Record<string, { label: string; color: BadgeColor }>;

export const ESTADO_TRAMITE: EstadoMap = {
  CAPTURA: { label: 'Captura', color: 'neutral' },
  EN_VALIDACION: { label: 'En validación', color: 'info' },
  APROBADO: { label: 'Aprobado', color: 'oro' },
  RECHAZADO: { label: 'Rechazado', color: 'error' },
  EXPIRADO: { label: 'Expirado', color: 'warning' },
  COBRO: { label: 'Cobro', color: 'vino' },
  FINALIZADO: { label: 'Finalizado', color: 'success' },
};

export const ESTADO_BORRADOR: EstadoMap = {
  ABIERTO: { label: 'Abierto', color: 'info' },
  APLICADO: { label: 'Aplicado', color: 'success' },
  VENCIDO: { label: 'Vencido', color: 'warning' },
  CANCELADO: { label: 'Cancelado', color: 'error' },
};

export const ESTADO_EVIDENCIA: EstadoMap = {
  CARGADO: { label: 'Cargado', color: 'info' },
  VALIDADO: { label: 'Validado', color: 'success' },
  RECHAZADO: { label: 'Rechazado', color: 'error' },
};

export const ESTADO_VERIFICACION: EstadoMap = {
  VIGENTE: { label: 'Vigente', color: 'success' },
  VENCIDA: { label: 'Vencida', color: 'warning' },
  ANULADA: { label: 'Anulada', color: 'error' },
};

export function EstadoDeBadge({ estado, mapa }: { estado: string; mapa: EstadoMap }) {
  const entry = mapa[estado] ?? { label: estado, color: 'neutral' as BadgeColor };
  return <EstadoBadge label={entry.label} color={entry.color} />;
}
