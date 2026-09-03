import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import type { DocumentoNodo } from './catalogoTipos';

export function EditarDocumentoDialog({ documento, onGuardar, onClose, pendiente }: {
  documento: DocumentoNodo;
  onGuardar: (payload: { nombre: string }) => void;
  onClose: () => void;
  pendiente: boolean;
}) {
  const [nombre, setNombre] = useState(documento.nombre);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar documento</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <TextField label="Nombre del documento" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} disabled={pendiente}>Cancelar</Button>
        <Button variant="contained" disabled={!nombre || pendiente} onClick={() => onGuardar({ nombre })}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}
