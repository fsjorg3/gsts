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
    <Card titulo="Plazos operativos">
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
        El plazo de pago se estampa al aprobar un trámite. El plazo para solicitar factura ya no se configura aquí: lo
        calcula el sistema Finanzas desde la fecha de pago.
      </Typography>
      {!vigente.isPending && !vigente.data ? (
        <Alert severity="info" icon={<MsIcon name="info" size={20} />} sx={{ mb: 2 }}>
          Aún no hay una configuración guardada; se creará al guardar por primera vez.
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField label="Plazo de pago (días)" value={pago} onChange={(e) => { setEditado(true); setPago(e.target.value.replace(/\D/g, '')); }} sx={{ width: 200 }} />
        <TextField
          label="Ventana de gracia de revalidación (minutos)"
          helperText="Si el cobro ocurre dentro de estos minutos desde la aprobación, no se exige revalidar. 0 = exigirla siempre."
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
