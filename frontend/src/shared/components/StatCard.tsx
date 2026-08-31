import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { MsIcon } from './MsIcon';
import type { IconoNombre } from './iconos';

// KPI card del prototipo: ícono + etiqueta arriba, valor grande abajo.
export interface StatCardProps {
  icon: IconoNombre;
  iconColor?: string;
  label: string;
  value: string;
}

export function StatCard({ icon, iconColor = '#5B132B', label, value }: StatCardProps) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 2, py: 1.875 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MsIcon name={icon} size={18} color={iconColor} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', lineHeight: 1.2 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, mt: 1 }}>{value}</Typography>
    </Box>
  );
}
