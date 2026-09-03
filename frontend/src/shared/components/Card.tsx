import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Wrapper genérico de sección: borde + fondo del design system institucional.
// `titulo` es opcional (Administración siempre lo pasa; PasoCobro nunca).
// `deshabilitada` atenúa el contenido y bloquea la interacción (PasoCobro la
// usa mientras una tarjeta previa del flujo aún no se completa).
export interface CardProps {
  titulo?: string;
  deshabilitada?: boolean;
  children: React.ReactNode;
}

export function Card({ titulo, deshabilitada = false, children }: CardProps) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2.5,
        opacity: deshabilitada ? 0.55 : 1,
        pointerEvents: deshabilitada ? 'none' : 'auto',
      }}
    >
      {titulo ? <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>{titulo}</Typography> : null}
      {children}
    </Box>
  );
}
