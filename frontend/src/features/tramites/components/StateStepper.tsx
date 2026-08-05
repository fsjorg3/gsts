import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { MsIcon } from '@/shared/components';

// Barra de progreso del wizard (5 nodos) fiel al prototipo: círculos de 30px,
// check en completados, líneas vino. Es presentación de la máquina de estados,
// no navegación: el paso activo se deriva del estado del trámite en el server.
export const PASOS = ['Captura', 'Validación', 'Aprobación', 'Cobro y emisión', 'Entrega'] as const;

const VINO = '#3D0017';
const LINEA_HECHA = '#5B132B';
const LINEA_FUTURA = '#E9ECEF';

export function StateStepper({ pasoActivo }: { pasoActivo: number }) {
  return (
    <Box component="ol" sx={{ display: 'flex', alignItems: 'flex-start', px: 3.5, pt: 0.75, pb: 2.25, m: 0, listStyle: 'none' }}>
      {PASOS.map((titulo, i) => {
        const hecho = i < pasoActivo;
        const activo = i === pasoActivo;
        return (
          <Box component="li" key={titulo} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ height: 2, flex: 1, bgcolor: i === 0 ? 'transparent' : i <= pasoActivo ? LINEA_HECHA : LINEA_FUTURA }} />
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  ...(hecho
                    ? { bgcolor: VINO, color: '#fff' }
                    : activo
                      ? { bgcolor: '#fff', color: VINO, border: `2px solid ${VINO}` }
                      : { bgcolor: '#fff', color: 'text.disabled', border: `2px solid ${LINEA_FUTURA}` }),
                }}
              >
                {hecho ? <MsIcon name="check" size={18} /> : i + 1}
              </Box>
              <Box sx={{ height: 2, flex: 1, bgcolor: i === PASOS.length - 1 ? 'transparent' : i < pasoActivo ? LINEA_HECHA : LINEA_FUTURA }} />
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: activo || hecho ? 700 : 500,
                color: activo ? 'text.primary' : hecho ? 'primary.light' : 'text.disabled',
                mt: 0.875,
                textAlign: 'center',
              }}
            >
              {titulo}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
