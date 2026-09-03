import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useNotificar } from '@/store/useNotificar';
import type { VersionCatalogoConArbol } from '@/features/catalogos/api';
import { useAgregarGrupo } from '../../api';

export function AltaGrupoForm({ borradorId, arbol }: { borradorId: string; arbol: VersionCatalogoConArbol | undefined }) {
  const notificar = useNotificar();
  const agregarGrupo = useAgregarGrupo(borradorId);
  const [grupo, setGrupo] = useState({ clave: '', nombre: '', aplicaTipo: '', aplicaPersonalidad: '', aplicaRepresentacion: '' });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr 1fr 1fr auto' }, gap: 1.5, mb: 1.5 }}>
      <TextField label="Clave" value={grupo.clave} onChange={(e) => setGrupo({ ...grupo, clave: e.target.value.toUpperCase() })} />
      <TextField label="Nombre del grupo" value={grupo.nombre} onChange={(e) => setGrupo({ ...grupo, nombre: e.target.value })} />
      <TextField select label="Tipo" value={grupo.aplicaTipo} onChange={(e) => setGrupo({ ...grupo, aplicaTipo: e.target.value })}>
        <MenuItem value="">Todos</MenuItem>
        <MenuItem value="NO_ADEUDO">No adeudo</MenuItem>
        <MenuItem value="NO_REGISTRO">No registro</MenuItem>
      </TextField>
      <TextField select label="Personalidad" value={grupo.aplicaPersonalidad} onChange={(e) => setGrupo({ ...grupo, aplicaPersonalidad: e.target.value })}>
        <MenuItem value="">Todas</MenuItem>
        <MenuItem value="FISICA">Física</MenuItem>
        <MenuItem value="MORAL">Moral</MenuItem>
      </TextField>
      <TextField select label="Representación" value={grupo.aplicaRepresentacion} onChange={(e) => setGrupo({ ...grupo, aplicaRepresentacion: e.target.value })}>
        <MenuItem value="">Todas</MenuItem>
        <MenuItem value="TITULAR">Titular</MenuItem>
        <MenuItem value="REPRESENTANTE">Representante</MenuItem>
        <MenuItem value="APODERADO">Apoderado</MenuItem>
      </TextField>
      <Button
        variant="outlined"
        disabled={!grupo.clave || !grupo.nombre || agregarGrupo.isPending}
        onClick={() =>
          agregarGrupo.mutate(
            {
              clave: grupo.clave,
              nombre: grupo.nombre,
              orden: arbol?.grupos.length ?? 0,
              ...(grupo.aplicaTipo ? { aplicaTipo: grupo.aplicaTipo as 'NO_ADEUDO' | 'NO_REGISTRO' } : {}),
              ...(grupo.aplicaPersonalidad ? { aplicaPersonalidad: grupo.aplicaPersonalidad as 'FISICA' | 'MORAL' } : {}),
              ...(grupo.aplicaRepresentacion ? { aplicaRepresentacion: grupo.aplicaRepresentacion as 'TITULAR' | 'REPRESENTANTE' | 'APODERADO' } : {}),
            },
            { onSuccess: () => setGrupo({ clave: '', nombre: '', aplicaTipo: '', aplicaPersonalidad: '', aplicaRepresentacion: '' }), onError: (error) => notificar.error(error) },
          )
        }
      >
        + Grupo
      </Button>
    </Box>
  );
}
