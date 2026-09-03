import { useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useAuth as useOidc } from 'react-oidc-context';
import { rutaDeRegreso } from './oidc';
import { SesionExpiradaDialog } from './SesionExpiradaDialog';

// Rutas públicas del frontend, sin sesión: el callback de front-channel logout
// (ver LogoutFrontChannel.tsx), que Keycloak carga en un iframe oculto, y las
// de verificación de constancias (features/verificacion-publica), que abre un
// ciudadano desde el QR impreso o tecleando el enlace — forzarlas por
// Keycloak las volvería inútiles para quien no tiene cuenta en GSTS.
const RUTAS_PUBLICAS: RegExp[] = [
  /^\/logout-frontchannel$/,
  /^\/verificar$/,
  /^\/constancias\/[^/]+\/verificar\/[^/]+$/,
];

// Toda la app interna exige sesión: si no hay usuario, redirige a Keycloak —
// salvo las rutas públicas de arriba.
export function AuthGate({ children }: { children: ReactNode }) {
  const oidc = useOidc();
  const esRutaPublica = RUTAS_PUBLICAS.some((patron) => patron.test(window.location.pathname));

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
