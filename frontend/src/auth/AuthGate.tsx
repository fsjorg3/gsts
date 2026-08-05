import { useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useAuth as useOidc } from 'react-oidc-context';

// Toda la app interna exige sesión: si no hay usuario, redirige a Keycloak.
export function AuthGate({ children }: { children: ReactNode }) {
  const oidc = useOidc();

  useEffect(() => {
    if (!oidc.isLoading && !oidc.isAuthenticated && !oidc.activeNavigator && !oidc.error) {
      void oidc.signinRedirect();
    }
  }, [oidc]);

  if (oidc.error) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, px: 4 }}>
        <Typography sx={{ fontWeight: 700 }}>No se pudo iniciar sesión</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Verifica tu conexión con Keycloak e intenta de nuevo.
        </Typography>
        {/* Detalle técnico temporal para depuración (quitar antes de producción). */}
        <Typography variant="caption" sx={{ color: 'error.main', fontFamily: 'monospace', textAlign: 'center', maxWidth: 640 }}>
          {oidc.error.name}: {oidc.error.message}
        </Typography>
      </Box>
    );
  }

  if (!oidc.isAuthenticated) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return children;
}
