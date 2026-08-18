import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

/**
 * Confirmación genérica de una acción destructiva. Botón de confirmar en
 * `color="error"`; `pendiente` deshabilita mientras corre la mutación.
 */
export function ConfirmDialog({
  open,
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  onConfirm,
  onClose,
  pendiente,
}: {
  open: boolean;
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar?: string;
  onConfirm: () => void;
  onClose: () => void;
  pendiente: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{titulo}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{mensaje}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} disabled={pendiente}>Cancelar</Button>
        <Button variant="contained" color="error" disabled={pendiente} onClick={onConfirm}>
          {textoConfirmar}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
