import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { MsIcon } from '@/shared/components';

/**
 * Chrome mínimo para las páginas públicas de verificación: fuera del árbol de
 * AppShell (sin sidebar, sin sesión), así que arma su propio encabezado con
 * la misma marca que usa AppShell en el sidebar.
 */
export function PaginaVerificacion({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' }, bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MsIcon name="water_drop" size={22} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>GSTS</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled', lineHeight: 1.3 }}>
            Verificación pública de constancias
          </Typography>
        </Box>
      </Box>

      <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', alignItems: 'center', py: 4 }}>
        <Box sx={{ width: '100%' }}>{children}</Box>
      </Container>
    </Box>
  );
}
