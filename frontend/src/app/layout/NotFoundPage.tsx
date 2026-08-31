import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router';
import { MsIcon } from '@/shared/components';

// Ruta comodín (path: '*') del árbol de AppShell: cualquier URL que no
// matchee ninguna ruta conocida cae aquí. Mismo patrón visual que RequireRole
// cuando bloquea por rol (sidebar + contenido centrado, sin ModuleHeader),
// más un botón de salida explícita porque, a diferencia de RequireRole, aquí
// el usuario no está parado en ningún módulo válido para otro rol.
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 4 }}>
      <MsIcon name="search_off" size={40} color="#A7ADB3" />
      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Página no encontrada</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 420 }}>
        La dirección que intentaste abrir no existe en GSTS. Verifica la liga o vuelve al inicio.
      </Typography>
      <Button variant="contained" onClick={() => void navigate('/')} endIcon={<MsIcon name="home" size={18} />}>
        Volver al inicio
      </Button>
    </Box>
  );
}
