import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatFecha } from '@/api/serializers';
import { MsIcon } from '@/shared/components';
import type { TramiteDetalle } from '../api';

// Paso 2 · Aprobación: confirmación + plazo de pago estampado por el trigger.
export function PasoAprobacion({ tramite }: { tramite: TramiteDetalle }) {
  const plazoVencido = tramite.plazoPagoHasta ? new Date(tramite.plazoPagoHasta).getTime() < Date.now() : false;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid #C8E6C9', borderRadius: 1, p: 3.25, textAlign: 'center' }}>
        <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.75 }}>
          <MsIcon name="verified" size={34} color="#2E7D32" />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Trámite aprobado</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', mt: 0.75, maxWidth: 440, mx: 'auto' }}>
          El expediente está completo y validado. Continúa con el cobro dentro del plazo para emitir la constancia.
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderLeft: '6px solid #B8822A', borderRadius: 1, p: 2.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <MsIcon name="schedule" size={18} color="#9F7122" />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Plazo de pago</Typography>
          </Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{formatFecha(tramite.plazoPagoHasta)}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: plazoVencido ? 'error.main' : 'text.secondary', mt: 0.5 }}>
            {plazoVencido
              ? 'El plazo venció: el trámite debe marcarse como expirado.'
              : 'Si expira sin cobro, el trámite se cierra (EXPIRADO).'}
          </Typography>
        </Box>
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <MsIcon name="description" size={18} color="#5B132B" />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Constancia</Typography>
          </Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Aún no se genera</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', mt: 0.5 }}>
            Se emite tras el cobro, con firma institucional y folio único.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
