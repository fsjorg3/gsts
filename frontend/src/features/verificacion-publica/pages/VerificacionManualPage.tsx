import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { copyDeError } from '@/api/errors';
import { MsIcon } from '@/shared/components';
import { verificarManual } from '../api';
import { PaginaVerificacion } from '../PaginaVerificacion';
import { ResultadoVerificacion } from '../ResultadoVerificacion';

/**
 * Fallback para cuando el QR de la constancia no se puede escanear ni
 * fotografiar. Sólo pide folio y código: nunca folio solo, porque el folio es
 * consecutivo y por tanto adivinable — la seguridad recae en el código, no en
 * mantener el folio en secreto.
 */
export function VerificacionManualPage() {
  const [folio, setFolio] = useState('');
  const [codigo, setCodigo] = useState('');
  const mutacion = useMutation({ mutationFn: () => verificarManual(folio.trim(), codigo.trim()) });

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    mutacion.reset();
    mutacion.mutate();
  }

  return (
    <PaginaVerificacion>
      {mutacion.data ? (
        <ResultadoVerificacion resultado={mutacion.data} />
      ) : (
        <Paper component="form" variant="outstanding" onSubmit={alEnviar} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MsIcon name="fact_check" size={26} color="#3D0017" />
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Verificar una constancia</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Usa esta opción si no puedes escanear el código QR de tu constancia. Ambos datos están impresos junto al QR, en la esquina inferior izquierda del documento.
          </Typography>

          <TextField
            label="Folio"
            placeholder="GSTS-1234"
            value={folio}
            onChange={(evento) => setFolio(evento.target.value)}
            required
            fullWidth
            size="small"
          />
          <TextField
            label="Código de verificación"
            placeholder="Código corto impreso bajo el QR"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            required
            fullWidth
            size="small"
          />

          {mutacion.isError ? (
            <Typography variant="body2" sx={{ color: 'error.main' }}>{copyDeError(mutacion.error)}</Typography>
          ) : null}

          <Button type="submit" variant="contained" disabled={mutacion.isPending || !folio.trim() || !codigo.trim()}>
            {mutacion.isPending ? 'Verificando…' : 'Verificar'}
          </Button>
        </Paper>
      )}
    </PaginaVerificacion>
  );
}
