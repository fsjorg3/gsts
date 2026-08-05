import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Encabezado de módulo (60px): título + subtítulo a la izquierda, acciones a la derecha.
export interface ModuleHeaderProps {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
}

export function ModuleHeader({ titulo, subtitulo, acciones }: ModuleHeaderProps) {
  return (
    <Box
      sx={{
        height: 60,
        flexShrink: 0,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        px: 3.5,
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{titulo}</Typography>
        {subtitulo ? (
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mt: 0.25, lineHeight: 1.3 }}>
            {subtitulo}
          </Typography>
        ) : null}
      </Box>
      {acciones}
    </Box>
  );
}
