import { StrictMode } from 'react';
import type { User } from 'oidc-client-ts';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from 'react-oidc-context';
import { RouterProvider } from 'react-router/dom';
import { store } from '@/app/store';
import { router } from '@/app/router';
import { theme } from '@/app/theme';
import { AuthGate } from '@/auth/AuthGate';
import { userManager } from '@/auth/oidc';

// Tipografía e iconografía del design system (self-host, sin CDN).
// Los iconos van en un subconjunto propio con los ~55 que la app usa, no la
// fuente completa del paquete (4.9 MB): ver app/iconos.css y shared/components/iconos.ts.
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@/app/iconos.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los triggers de negocio viven en el backend: reintentos automáticos
      // sólo para fallas de red, nunca para 4xx.
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No existe el elemento #root');

// Al volver del login de Keycloak: limpiar code/state de la URL y restaurar la
// ruta desde la que se pidió la sesión (`state.returnTo`, ver oidc.ts). Sin
// esto todo login aterriza en la raíz, porque redirect_uri es siempre `/`.
function onSigninCallback(user: User | undefined) {
  const returnTo = (user?.state as { returnTo?: string } | undefined)?.returnTo;
  // Sólo rutas internas: un `state` manipulado no debe poder mandar a otro sitio.
  const destino = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : window.location.pathname;
  window.history.replaceState({}, document.title, destino);
}

// AuthProvider queda fuera de StrictMode a propósito: procesa el callback de
// Keycloak (code/state) en un efecto al montar, y el "state" en sessionStorage
// se borra al consumirse la primera vez — el remount doble de StrictMode
// dispara una segunda lectura que ya no lo encuentra ("No matching state
// found in storage"). El resto del árbol sí se beneficia de StrictMode.
createRoot(rootElement).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
        <StrictMode>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthGate>
              <RouterProvider router={router} />
            </AuthGate>
          </ThemeProvider>
        </StrictMode>
      </AuthProvider>
    </QueryClientProvider>
  </Provider>,
);
