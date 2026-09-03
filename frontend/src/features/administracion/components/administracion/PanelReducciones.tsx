import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { Card, EstadoBadge } from '@/shared/components';
import { motivosReduccionOptions, useActualizarMotivoReduccion, useCrearMotivoReduccion } from '@/features/motivos-reduccion/api';

export function PanelReducciones() {
  const notificar = useNotificar();
  const motivos = useQuery(motivosReduccionOptions());
  const crear = useCrearMotivoReduccion();
  const actualizar = useActualizarMotivoReduccion();
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [porcentaje, setPorcentaje] = useState('');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Card titulo="Motivos de reducción">
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
          El porcentaje se congela en cada cobro al momento de aplicarse: editar o desactivar un motivo aquí nunca
          altera cobros ya registrados, sólo deja de ofrecerse hacia adelante.
        </Typography>
        {(motivos.data ?? []).length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>Sin motivos registrados.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(motivos.data ?? []).map((m) => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                <EstadoBadge label={m.activo ? 'Activo' : 'Inactivo'} color={m.activo ? 'success' : 'neutral'} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{m.nombre} <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>({m.clave})</Box></Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{Number(m.porcentaje)} %</Typography>
                <Button
                  size="small"
                  variant="text"
                  disabled={actualizar.isPending}
                  onClick={() =>
                    actualizar.mutate(
                      { id: m.id, activo: !m.activo },
                      { onError: (error) => notificar.error(error) },
                    )
                  }
                >
                  {m.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card titulo="Nuevo motivo">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr auto' }, gap: 2, alignItems: 'start' }}>
          <TextField label="Clave" value={clave} onChange={(e) => setClave(e.target.value.toUpperCase())} placeholder="INAPAM" />
          <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="INAPAM / discapacidad" />
          <TextField label="Porcentaje" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value.replace(/[^0-9.]/g, ''))} />
          <Button
            variant="outlined"
            disabled={!clave.trim() || !nombre.trim() || !Number(porcentaje) || crear.isPending}
            onClick={() =>
              crear.mutate(
                { clave: clave.trim(), nombre: nombre.trim(), porcentaje: Number(porcentaje) },
                {
                  onSuccess: () => { setClave(''); setNombre(''); setPorcentaje(''); notificar.exito('Motivo de reducción creado.'); },
                  onError: (error) => notificar.error(error),
                },
              )
            }
          >
            Crear
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
