import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

// Ícono del sistema: Material Symbols Rounded (opsz 24, wght 400, fill 0).
// El design system prohíbe otros sets de iconos, emoji y SVG a medida.
export interface MsIconProps {
  name: string;
  size?: number;
  color?: string;
  sx?: SxProps<Theme>;
}

export function MsIcon({ name, size = 20, color, sx }: MsIconProps) {
  return (
    <Box
      component="span"
      aria-hidden
      className="material-symbols-rounded"
      sx={[
        {
          fontFamily: '"Material Symbols Rounded"',
          fontWeight: 400,
          fontStyle: 'normal',
          fontSize: size,
          lineHeight: 1,
          display: 'inline-block',
          verticalAlign: 'middle',
          userSelect: 'none',
          color: color ?? 'inherit',
          fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {name}
    </Box>
  );
}
