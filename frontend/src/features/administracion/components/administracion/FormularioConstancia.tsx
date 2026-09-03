import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { MsIcon } from '@/shared/components';
import { configuracionConstanciaOptions, useGuardarConfiguracionConstancia, type TipoConstancia } from '../../api';

export function FormularioConstancia({ tipo, etiqueta }: { tipo: TipoConstancia; etiqueta: string }) {
  const notificar = useNotificar();
  const vigente = useQuery(configuracionConstanciaOptions(tipo));
  const guardar = useGuardarConfiguracionConstancia(tipo);
  const [dias, setDias] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [editado, setEditado] = useState(false);

  useEffect(() => {
    if (editado || !vigente.data) return;
    setDias(String(vigente.data.vigenciaDias));
    setNombre(vigente.data.firmanteNombre);
    setCargo(vigente.data.firmanteCargo);
  }, [vigente.data, editado]);

  const listo = Boolean(Number(dias)) && nombre.trim() !== '' && cargo.trim() !== '';

  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.25 }}>{etiqueta}</Typography>
      {!vigente.isPending && !vigente.data ? (
        <Alert severity="warning" icon={<MsIcon name="warning" size={20} />} sx={{ mb: 1.75 }}>
          Sin configurar: no se pueden emitir constancias de este tipo hasta guardar la vigencia y el firmante.
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField label="Vigencia (días naturales)" value={dias} onChange={(e) => { setEditado(true); setDias(e.target.value.replace(/\D/g, '')); }} sx={{ width: 190 }} />
        <TextField label="Nombre del firmante" value={nombre} onChange={(e) => { setEditado(true); setNombre(e.target.value); }} sx={{ width: 280 }} />
        <TextField label="Cargo del firmante" value={cargo} onChange={(e) => { setEditado(true); setCargo(e.target.value); }} sx={{ width: 320 }} />
        <Button
          variant="contained"
          disabled={!listo || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              { vigenciaDias: Number(dias), firmanteNombre: nombre.trim(), firmanteCargo: cargo.trim() },
              { onSuccess: () => { setEditado(false); notificar.exito(`Configuración de ${etiqueta} actualizada.`); }, onError: (error) => notificar.error(error) },
            )
          }
        >
          Guardar
        </Button>
      </Box>
    </Box>
  );
}
