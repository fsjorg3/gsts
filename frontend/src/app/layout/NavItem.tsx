import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { NavLink } from 'react-router';
import { MsIcon, type IconoNombre } from '@/shared/components';

// Fila de navegación del sidebar (design system): hover gris, activa con
// wash vino y barra izquierda de 3px.
export interface NavItemProps {
  to: string;
  icon: IconoNombre;
  label: string;
  badge?: number;
}

export function NavItem({ to, icon, label, badge }: NavItemProps) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            height: 40,
            borderLeft: '3px solid',
            borderLeftColor: isActive ? 'primary.main' : 'transparent',
            bgcolor: isActive ? '#F8F1F3' : 'transparent',
            color: isActive ? 'primary.main' : 'text.secondary',
            transition: 'background-color 150ms ease-out, color 150ms ease-out',
            '&:hover': { bgcolor: isActive ? '#F8F1F3' : 'grey.100' },
          }}
        >
          <MsIcon name={icon} size={20} />
          <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'inherit' }}>{label}</Typography>
          {badge !== undefined && badge > 0 ? (
            <Box
              sx={{
                minWidth: 20,
                height: 20,
                px: 0.5,
                borderRadius: 999,
                bgcolor: 'error.main',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {badge}
            </Box>
          ) : null}
        </Box>
      )}
    </NavLink>
  );
}
