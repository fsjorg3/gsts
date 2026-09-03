import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { GrupoConArbol } from '@/features/catalogos/api';
import type { FiltroGrupo, FiltroPersonalidad, FiltroRepresentacion } from './catalogoTipos';

export function EditarGrupoDialog({ grupo, onGuardar, onClose, pendiente }: {
  grupo: GrupoConArbol;
  onGuardar: (payload: {
    clave: string; nombre: string;
    aplicaTipo: 'NO_ADEUDO' | 'NO_REGISTRO' | null;
    aplicaPersonalidad: 'FISICA' | 'MORAL' | null;
    aplicaRepresentacion: 'TITULAR' | 'REPRESENTANTE' | 'APODERADO' | null;
  }) => void;
  onClose: () => void;
  pendiente: boolean;
}) {
  const [clave, setClave] = useState(grupo.clave);
  const [nombre, setNombre] = useState(grupo.nombre);
  const [aplicaTipo, setAplicaTipo] = useState<FiltroGrupo>(grupo.aplicaTipo ?? '');
  const [aplicaPersonalidad, setAplicaPersonalidad] = useState<FiltroPersonalidad>(grupo.aplicaPersonalidad ?? '');
  const [aplicaRepresentacion, setAplicaRepresentacion] = useState<FiltroRepresentacion>(grupo.aplicaRepresentacion ?? '');
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar grupo</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: 1 }}>
        <TextField label="Clave" value={clave} onChange={(e) => setClave(e.target.value.toUpperCase())} />
        <TextField label="Nombre del grupo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <TextField select label="Tipo" value={aplicaTipo} onChange={(e) => setAplicaTipo(e.target.value as FiltroGrupo)}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="NO_ADEUDO">No adeudo</MenuItem>
          <MenuItem value="NO_REGISTRO">No registro</MenuItem>
        </TextField>
        <TextField select label="Personalidad" value={aplicaPersonalidad} onChange={(e) => setAplicaPersonalidad(e.target.value as FiltroPersonalidad)}>
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="FISICA">Física</MenuItem>
          <MenuItem value="MORAL">Moral</MenuItem>
        </TextField>
        <TextField select label="Representación" value={aplicaRepresentacion} onChange={(e) => setAplicaRepresentacion(e.target.value as FiltroRepresentacion)}>
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="TITULAR">Titular</MenuItem>
          <MenuItem value="REPRESENTANTE">Representante</MenuItem>
          <MenuItem value="APODERADO">Apoderado</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="text" onClick={onClose} disabled={pendiente}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!clave || !nombre || pendiente}
          onClick={() => onGuardar({
            clave, nombre,
            aplicaTipo: aplicaTipo === '' ? null : aplicaTipo,
            aplicaPersonalidad: aplicaPersonalidad === '' ? null : aplicaPersonalidad,
            aplicaRepresentacion: aplicaRepresentacion === '' ? null : aplicaRepresentacion,
          })}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
