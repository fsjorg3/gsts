import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { CODEPOINTS } from './iconos.codepoints';
import type { IconoNombre } from './iconos';

// Ícono del sistema: Material Symbols Rounded (opsz 24, wght 400, fill 0).
// El design system prohíbe otros sets de iconos, emoji y SVG a medida.
//
// Se dibuja el codepoint del icono, no su nombre como ligadura: la fuente que
// embebemos es un subconjunto (ver iconos.ts) y subsetear por ligaduras es
// inviable — los nombres son letras a–z, así que el cierre de ligaduras
// retendría casi los 3 700 iconos. `name` sigue siendo el nombre de siempre.
export interface MsIconProps {
  name: IconoNombre;
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
      {CODEPOINTS[name]}
    </Box>
  );
}
