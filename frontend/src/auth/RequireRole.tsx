import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { MsIcon } from '@/shared/components';
import { useAuth, type RolSicef } from './useAuth';

// Guard de ruta por rol. Los roles vienen de GET /auth/me; un rol en la fuente
// equivocada del token simplemente no llega aquí.
export function RequireRole({ roles, children }: { roles: RolSicef[]; children: ReactNode }) {
  const { cargando, tieneRol } = useAuth();

  if (cargando) return null;

  if (!tieneRol(...roles)) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 4 }}>
        <MsIcon name="lock" size={40} color="#A7ADB3" />
        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Sin acceso a este módulo</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 420 }}>
          Tu cuenta no tiene el rol requerido ({roles.join(', ')}). Si crees que es un error, contacta a TI.
        </Typography>
      </Box>
    );
  }

  return children;
}
