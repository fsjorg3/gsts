import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Card, MsIcon } from '@/shared/components';

export function PanelValidarPublicar({
  errores,
  validarPendiente,
  publicarPendiente,
  onValidar,
  onPublicar,
  onDescartarSesion,
  onSolicitarDescartarBorrador,
}: {
  errores: string[] | null;
  validarPendiente: boolean;
  publicarPendiente: boolean;
  onValidar: () => void;
  onPublicar: () => void;
  onDescartarSesion: () => void;
  onSolicitarDescartarBorrador: () => void;
}) {
  return (
    <Card titulo="Validar y publicar">
      {errores ? (
        errores.length === 0 ? (
          <Alert severity="success" icon={<MsIcon name="check_circle" size={20} />} sx={{ mb: 1.5 }}>
            El catálogo es válido: cubre todas las combinaciones y no tiene duplicados.
          </Alert>
        ) : (
          <Alert severity="error" icon={<MsIcon name="error" size={20} />} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>El catálogo aún no puede publicarse:</Typography>
            {errores.map((e) => (
              <Typography key={e} sx={{ fontSize: 12.5 }}>· {e}</Typography>
            ))}
          </Alert>
        )
      ) : null}
      <Box sx={{ display: 'flex', gap: 1.25 }}>
        <Button variant="outlined" disabled={validarPendiente} onClick={onValidar}>
          Validar
        </Button>
        <Button variant="contained" disabled={publicarPendiente} onClick={onPublicar}>
          Publicar y activar
        </Button>
        <Button variant="text" onClick={onDescartarSesion}>Descartar sesión</Button>
        <Button variant="text" color="error" sx={{ ml: 'auto' }} onClick={onSolicitarDescartarBorrador}>
          Descartar borrador
        </Button>
      </Box>
    </Card>
  );
}
