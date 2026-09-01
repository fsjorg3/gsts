import { useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useAuth as useOidc } from 'react-oidc-context';
import { rutaDeRegreso } from './oidc';
import { SesionExpiradaDialog } from './SesionExpiradaDialog';

// Única ruta pública del frontend: callback de front-channel logout (ver
// LogoutFrontChannel.tsx), que Keycloak carga sin sesión en un iframe oculto.
const RUTA_LOGOUT_FRONTCHANNEL = '/logout-frontchannel';

// Toda la app interna exige sesión: si no hay usuario, redirige a Keycloak —
// salvo la ruta pública de arriba.
export function AuthGate({ children }: { children: ReactNode }) {
  const oidc = useOidc();
  const esRutaPublica = window.location.pathname === RUTA_LOGOUT_FRONTCHANNEL;

  useEffect(() => {
    if (esRutaPublica) return;
    if (!oidc.isLoading && !oidc.isAuthenticated && !oidc.activeNavigator && !oidc.error) {
      // `state.returnTo` conserva el deep link: redirect_uri es la raíz, así
      // que sin esto entrar a /ventanilla/tramites/{id} sin sesión aterriza en
      // el índice tras el login (ver oidc.ts y main.tsx).
      void oidc.signinRedirect({ state: { returnTo: rutaDeRegreso() } });
    }
  }, [oidc, esRutaPublica]);

  if (esRutaPublica) return children;

  if (oidc.error) {
    return (
      <Box
        sx={{
          height: '100vh',
          '@supports (height: 100dvh)': { height: '100dvh' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          px: 4,
        }}
      >
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
      <Box
        sx={{ height: '100vh', '@supports (height: 100dvh)': { height: '100dvh' }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <>
      {children}
      <SesionExpiradaDialog />
    </>
  );
}
