import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { MsIcon } from '@/shared/components';
import { copyDeError } from '@/api/errors';
import { verificacionPorQrOptions } from '../api';
import { ResultadoVerificacion } from '../ResultadoVerificacion';
import { PaginaVerificacion } from '../PaginaVerificacion';

/**
 * Destino del QR impreso en la constancia (ver urlVerificacion en el backend):
 * folio y token llegan en la URL, sin que el ciudadano teclee nada. Sin
 * sesión — AuthGate la trata como ruta pública.
 */
export function VerificacionQrPage() {
  const { folio, token } = useParams<{ folio: string; token: string }>();
  const { data, error, isPending } = useQuery(verificacionPorQrOptions(folio ?? '', token ?? ''));

  return (
    <PaginaVerificacion>
      {isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: 'primary.main' }} />
        </Box>
      ) : data ? (
        <ResultadoVerificacion resultado={data} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
          <MsIcon name="error" size={32} color="#BA1A1A" />
          <Typography sx={{ fontWeight: 700 }}>No se pudo verificar esta constancia</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{copyDeError(error)}</Typography>
          <Button component={Link} to="/verificar" variant="outlined" size="small">
            Verificar con folio y código
          </Button>
        </Box>
      )}
    </PaginaVerificacion>
  );
}
