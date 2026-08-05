import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

export function RechazoDialog({
  open,
  onClose,
  onConfirm,
  pendiente,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  pendiente: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Rechazar trámite</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.75 }}>
          Indica el motivo del rechazo. Quedará registrado en la bitácora y el trámite se cerrará sin emisión.
        </Typography>
        <TextField
          label="Motivo"
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          multiline
          minRows={3}
          fullWidth
          placeholder="Ej. Adeudo detectado en la cuenta; requisitos no acreditados…"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color="error"
          disabled={motivo.trim().length === 0 || pendiente}
          onClick={() => onConfirm(motivo.trim())}
        >
          Rechazar trámite
        </Button>
      </DialogActions>
    </Dialog>
  );
}
