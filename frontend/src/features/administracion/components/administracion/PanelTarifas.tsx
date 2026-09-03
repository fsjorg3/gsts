import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { formatMxn } from '@/api/serializers';
import { Card, EstadoBadge } from '@/shared/components';
import { tarifasActivasOptions } from '@/features/cobros/api';
import { useCrearTarifa, usePublicarTarifa, type Tarifa } from '../../api';

export function PanelTarifas() {
  const notificar = useNotificar();
  const activasNa = useQuery(tarifasActivasOptions('NO_ADEUDO'));
  const activasNr = useQuery(tarifasActivasOptions('NO_REGISTRO'));
  const crear = useCrearTarifa();
  const publicar = usePublicarTarifa();
  const [tipo, setTipo] = useState<'NO_ADEUDO' | 'NO_REGISTRO'>('NO_ADEUDO');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [version, setVersion] = useState('1');
  const [borrador, setBorrador] = useState<Tarifa | null>(null);

  const activas = [...(activasNa.data ?? []), ...(activasNr.data ?? [])];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Card titulo="Tarifas vigentes">
        {activas.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>No hay tarifas activas.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activas.map((t) => (
              <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                <EstadoBadge label={t.tipoConstancia === 'NO_ADEUDO' ? 'No adeudo' : 'No registro'} color="vino" />
                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t.concepto} · v{t.version}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{formatMxn(t.monto)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card titulo="Nueva tarifa (publicar desactiva la anterior del mismo tipo y concepto)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr 0.7fr' }, gap: 2, mb: 2 }}>
          <TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <MenuItem value="NO_ADEUDO">No adeudo</MenuItem>
            <MenuItem value="NO_REGISTRO">No registro</MenuItem>
          </TextField>
          <TextField label="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Constancia de no adeudo" />
          <TextField label="Monto (MXN)" value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))} />
          <TextField label="Versión" value={version} onChange={(e) => setVersion(e.target.value.replace(/\D/g, ''))} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
          <Button
            variant="outlined"
            disabled={!concepto.trim() || !Number(monto) || !Number(version) || crear.isPending}
            onClick={() =>
              crear.mutate(
                { tipoConstancia: tipo, concepto: concepto.trim(), monto: Number(monto), version: Number(version) },
                { onSuccess: (t) => { setBorrador(t); notificar.exito('Borrador de tarifa creado.'); }, onError: (error) => notificar.error(error) },
              )
            }
          >
            Crear borrador
          </Button>
          {borrador ? (
            <>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Borrador: {borrador.concepto} · {formatMxn(borrador.monto)}
              </Typography>
              <Button
                variant="contained"
                disabled={publicar.isPending}
                onClick={() =>
                  publicar.mutate(borrador.id, {
                    onSuccess: () => { setBorrador(null); notificar.exito('Tarifa publicada y activada.'); },
                    onError: (error) => notificar.error(error),
                  })
                }
              >
                Publicar y activar
              </Button>
            </>
          ) : null}
        </Box>
      </Card>
    </Box>
  );
}
