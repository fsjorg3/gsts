import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Outlet } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { MsIcon } from '@/shared/components';
import { MODULOS } from './modulos';
import { NavItem } from './NavItem';
import { Notifier } from './Notifier';

const SIDEBAR_WIDTH = 264;

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
export function AppShell() {
  const { nombre, roles, tieneRol, cerrarSesion } = useAuth();
  const modulosVisibles = MODULOS.filter((m) => tieneRol(...m.roles));
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box
        component="nav"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderRightColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
            <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>SICEF</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled', lineHeight: 1.3 }}>
              Constancias de no adeudo y no registro
            </Typography>
          </Box>
        </Box>

        {/* Navegación */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <SeccionLabel>Módulos</SeccionLabel>
          {modulosVisibles.map((m) => (
            <NavItem key={m.to} to={m.to} icon={m.icon} label={m.label} />
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
              {roles.join(' · ') || 'Sin rol SICEF'}
            </Typography>
          </Box>
          <Tooltip title="Cerrar sesión">
            <IconButton size="small" onClick={cerrarSesion} sx={{ color: 'text.secondary' }}>
              <MsIcon name="logout" size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Área del módulo */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </Box>

      <Notifier />
    </Box>
  );
}
