import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import type { OpcionNodo } from './catalogoTipos';

export function EditarOpcionDialog({ opcion, onGuardar, onClose, pendiente }: {
  opcion: OpcionNodo;
  onGuardar: (payload: { clave: string; nombre: string }) => void;
  onClose: () => void;
  pendiente: boolean;
}) {
  const [clave, setClave] = useState(opcion.clave);
  const [nombre, setNombre] = useState(opcion.nombre);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar opción</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: 1 }}>
        <TextField label="Clave" value={clave} onChange={(e) => setClave(e.target.value.toUpperCase())} />
        <TextField label="Nombre de la opción" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} disabled={pendiente}>Cancelar</Button>
        <Button variant="contained" disabled={!clave || !nombre || pendiente} onClick={() => onGuardar({ clave, nombre })}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}
