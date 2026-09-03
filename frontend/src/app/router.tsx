import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { LogoutFrontChannel } from '@/auth/LogoutFrontChannel';
import { RequireRole } from '@/auth/RequireRole';
import { useAuth } from '@/auth/useAuth';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './layout/NotFoundPage';
import { MODULOS } from './layout/modulos';

// Las páginas se cargan bajo demanda: sin esto, quien sólo usa Ventanilla
// descarga también Administración y Bitácora (y el wizard arrastra
// react-dropzone, qrcode.react y el formulario de facturación). El <Suspense>
// que las cubre está sobre el <Outlet> de AppShell.
//
// LogoutFrontChannel y NotFoundPage se quedan estáticos: el primero corre sin
// shell dentro de un iframe de Keycloak y el segundo es trivial.
const AdministracionPage = lazy(async () => ({ default: (await import('@/features/administracion/pages/AdministracionPage')).AdministracionPage }));
const BitacoraPage = lazy(async () => ({ default: (await import('@/features/bitacora/pages/BitacoraPage')).BitacoraPage }));
const ExportarPage = lazy(async () => ({ default: (await import('@/features/exportar/pages/ExportarPage')).ExportarPage }));
const NuevoTramite = lazy(async () => ({ default: (await import('@/features/tramites/pages/NuevoTramite')).NuevoTramite }));
const TramiteWizard = lazy(async () => ({ default: (await import('@/features/tramites/pages/TramiteWizard')).TramiteWizard }));
const VentanillaLista = lazy(async () => ({ default: (await import('@/features/tramites/pages/VentanillaLista')).VentanillaLista }));
const VerificacionQrPage = lazy(async () => ({ default: (await import('@/features/verificacion-publica/pages/VerificacionQrPage')).VerificacionQrPage }));
const VerificacionManualPage = lazy(async () => ({ default: (await import('@/features/verificacion-publica/pages/VerificacionManualPage')).VerificacionManualPage }));

// Envía a la ruta índice al primer módulo (en el orden de MODULOS) al que el
// usuario tenga acceso, en vez de asumir siempre /ventanilla — evita aterrizar
// en un módulo que ni siquiera aparece en su sidebar.
function IndexRedirect() {
  const { cargando, tieneRol } = useAuth();
  if (cargando) return null;
  const destino = MODULOS.find((m) => tieneRol(...m.roles))?.to ?? '/ventanilla';
  return <Navigate to={destino} replace />;
}

export const router = createBrowserRouter([
  // Ruta pública headless (sin sidebar/roles): callback de front-channel
  // logout, cargado por Keycloak en un iframe oculto. Excluida de AuthGate.
  { path: '/logout-frontchannel', element: <LogoutFrontChannel /> },
  // Rutas públicas de verificación de constancias — sin sesión, sin AppShell.
  // El path de la primera reproduce exactamente el que codifica el QR
  // impreso (ver urlVerificacion en el backend); AuthGate.tsx las excluye del
  // login forzado igual que /logout-frontchannel.
  {
    path: '/constancias/:folio/verificar/:token',
    element: (
      <Suspense fallback={null}>
        <VerificacionQrPage />
      </Suspense>
    ),
  },
  {
    path: '/verificar',
    element: (
      <Suspense fallback={null}>
        <VerificacionManualPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexRedirect /> },
      {
        path: 'ventanilla',
        element: (
          <RequireRole roles={['ventanilla']}>
            <VentanillaLista />
          </RequireRole>
        ),
      },
      {
        path: 'ventanilla/tramites/nuevo',
        element: (
          <RequireRole roles={['ventanilla']}>
            <NuevoTramite />
          </RequireRole>
        ),
      },
      {
        path: 'ventanilla/tramites/:id',
        element: (
          <RequireRole roles={['ventanilla']}>
            <TramiteWizard />
          </RequireRole>
        ),
      },
      {
        path: 'administracion',
        element: (
          <RequireRole roles={['ti']}>
            <AdministracionPage />
          </RequireRole>
        ),
      },
      {
        path: 'bitacora',
        element: (
          <RequireRole roles={['ti']}>
            <BitacoraPage />
          </RequireRole>
        ),
      },
      {
        path: 'exportar',
        element: (
          <RequireRole roles={['jefatura']}>
            <ExportarPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
