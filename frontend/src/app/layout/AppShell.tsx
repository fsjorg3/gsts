import { Suspense, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { MsIcon } from '@/shared/components';
import { MODULOS, seccionesDe } from './modulos';
import { NavItem } from './NavItem';
import { Notifier } from './Notifier';

const SIDEBAR_WIDTH = 264;

// Expuesto vía <Outlet context> para que ModuleHeader/TramiteWizard puedan
// abrir el Drawer temporal del sidebar por debajo de `lg` sin un Context propio.
export interface AppShellContext {
  abrirMenu: () => void;
}

function SeccionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="overline"
      sx={{ display: 'block', px: 2, pt: 2.5, pb: 1, color: 'text.disabled', fontSize: 11, letterSpacing: '0.08em' }}
    >
      {children}
    </Typography>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  const letras = `${partes[0]?.[0] ?? ''}${partes[1]?.[0] ?? ''}`.toUpperCase();
  return letras || '—';
}

// Layout raíz de la app interna: sidebar institucional (264px) + área de módulo.
// Por debajo de `lg` el sidebar se vuelve un Drawer temporal (overlay + hamburguesa
// en ModuleHeader/TramiteWizard, vía Outlet context); en `lg+` es permanente, igual
// que antes de introducir el Drawer.
export function AppShell() {
  const { nombre, roles, tieneRol, cerrarSesion } = useAuth();
  const secciones = seccionesDe(MODULOS.filter((m) => tieneRol(...m.roles)));
  const theme = useTheme();
  const esCompacto = useMediaQuery(theme.breakpoints.down('lg'));
  const [menuAbierto, setMenuAbierto] = useState(false);

  const contenidoNav = (
    <>
      {/* Marca */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: 'primary.main',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MsIcon name="water_drop" size={22} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>GSTS</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled', lineHeight: 1.3 }}>
            Gerencia de Supervisión Técnica de los Servicios
          </Typography>
        </Box>
      </Box>

      {/* Navegación */}
      <Box sx={{ flex: 1, overflowY: 'auto' }} onClick={() => setMenuAbierto(false)}>
        {secciones.map((seccion) => (
          <Box key={seccion.label}>
            <SeccionLabel>{seccion.label}</SeccionLabel>
            {seccion.modulos.map((m) => (
              <NavItem key={m.to} to={m.to} icon={m.icon} label={m.label} />
            ))}
          </Box>
        ))}
      </Box>

      {/* Usuario */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.75,
          borderTop: '1px solid',
          borderTopColor: 'divider',
        }}
      >
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
          {iniciales(nombre)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
            {nombre}
          </Typography>
          <Typography noWrap sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled', lineHeight: 1.3, textTransform: 'capitalize' }}>
            {roles.join(' · ') || 'Sin rol GSTS'}
          </Typography>
        </Box>
        <Tooltip title="Cerrar sesión">
          <IconButton size="small" onClick={cerrarSesion} sx={{ color: 'text.secondary' }}>
            <MsIcon name="logout" size={20} />
          </IconButton>
        </Tooltip>
      </Box>
    </>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        '@supports (height: 100dvh)': { height: '100dvh' },
        overflow: 'hidden',
      }}
    >
      <Drawer
        variant={esCompacto ? 'temporary' : 'permanent'}
        open={esCompacto ? menuAbierto : true}
        onClose={() => setMenuAbierto(false)}
        ModalProps={esCompacto ? { keepMounted: true } : undefined}
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
        }}
      >
        {contenidoNav}
      </Drawer>

      {/* Área del módulo */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Las páginas se cargan bajo demanda (ver router.tsx); mientras llega
            el chunk se muestra el mismo spinner que usa AuthGate al entrar. */}
        <Suspense fallback={<CargandoModulo />}>
          <Outlet context={{ abrirMenu: () => setMenuAbierto(true) }} />
        </Suspense>
      </Box>

      <Notifier />
    </Box>
  );
}

function CargandoModulo() {
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={28} sx={{ color: 'primary.main' }} />
    </Box>
  );
}
