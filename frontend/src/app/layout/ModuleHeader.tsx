import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { MsIcon } from '@/shared/components';

// Encabezado de módulo (60px): título + subtítulo a la izquierda, acciones a la derecha.
export interface ModuleHeaderProps {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  onAbrirMenu?: () => void;
}

export function ModuleHeader({ titulo, subtitulo, acciones, onAbrirMenu }: ModuleHeaderProps) {
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
      {onAbrirMenu ? (
        <IconButton
          size="small"
          onClick={onAbrirMenu}
          sx={{ display: { xs: 'inline-flex', lg: 'none' }, color: 'text.secondary' }}
        >
          <MsIcon name="menu" size={22} />
        </IconButton>
      ) : null}
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
