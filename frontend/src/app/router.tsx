import { createBrowserRouter, Navigate } from 'react-router';
import { RequireRole } from '@/auth/RequireRole';
import { useAuth } from '@/auth/useAuth';
import { AdministracionPage } from '@/features/administracion/pages/AdministracionPage';
import { BitacoraPage } from '@/features/bitacora/pages/BitacoraPage';
import { DireccionPage } from '@/features/direccion/pages/DireccionPage';
import { FinanzasPage } from '@/features/facturacion/pages/FinanzasPage';
import { NuevoTramite } from '@/features/tramites/pages/NuevoTramite';
import { TramiteWizard } from '@/features/tramites/pages/TramiteWizard';
import { VentanillaLista } from '@/features/tramites/pages/VentanillaLista';
import { AppShell } from './layout/AppShell';
import { MODULOS } from './layout/modulos';

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
        path: 'finanzas',
        element: (
          <RequireRole roles={['finanzas']}>
            <FinanzasPage />
          </RequireRole>
        ),
      },
      {
        path: 'direccion',
        element: (
          <RequireRole roles={['direccion']}>
            <DireccionPage />
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
    ],
  },
]);
