import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { Card, MsIcon } from '@/shared/components';
import { plazosOptions, useGuardarPlazos } from '../../api';

export function PanelPlazos() {
  const notificar = useNotificar();
  const vigente = useQuery(plazosOptions);
  const guardar = useGuardarPlazos();
  const [pago, setPago] = useState('');
  const [gracia, setGracia] = useState('');
  const [editado, setEditado] = useState(false);

  // Precarga desde el servidor una sola vez; si el usuario ya está editando,
  // no pisar lo que está escribiendo (p. ej. tras el refetch al guardar).
  useEffect(() => {
    if (editado || !vigente.data) return;
    setPago(String(vigente.data.plazoPagoDias));
    setGracia(String(vigente.data.revalidacionGraciaMinutos));
  }, [vigente.data, editado]);

  return (
    <Card titulo="Configuración de plazos">
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
        Define los plazos aplicables al proceso de pago y validación de los trámites.
      </Typography>
      {!vigente.isPending && !vigente.data ? (
        <Alert severity="info" icon={<MsIcon name="info" size={20} />} sx={{ mb: 2 }}>
          Aún no hay una configuración guardada; se creará al guardar por primera vez.
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'start', flexWrap: 'wrap' }}>
        
        <TextField label="Plazo para realizar el pago (días)" helperText="Número de días disponibles para realizar el pago después de la aprobación del trámite." value={pago} onChange={(e) => { setEditado(true); setPago(e.target.value.replace(/\D/g, '')); }} sx={{ width: 200 }} />

        <TextField
          label="Periodo sin revalidación (minutos)"
          helperText="Durante este periodo posterior a la aprobación, el pago puede realizarse sin revalidar el trámite. Ingresa 0 para requerir revalidación en todos los casos."
          value={gracia}
          onChange={(e) => { setEditado(true); setGracia(e.target.value.replace(/\D/g, '')); }}
          sx={{ width: 280 }}
        />

        <Button
          variant="contained"
          disabled={!Number(pago) || gracia === '' || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              { plazoPagoDias: Number(pago), revalidacionGraciaMinutos: Number(gracia) },
              { onSuccess: () => { setEditado(false); notificar.exito('Plazos operativos actualizados.'); }, onError: (error) => notificar.error(error) },
            )
          }
        >
          Guardar plazos
        </Button>

      </Box>
    </Card>
  );
}
