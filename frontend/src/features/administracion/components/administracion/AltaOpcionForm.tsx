import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useNotificar } from '@/store/useNotificar';
import type { VersionCatalogoConArbol } from '@/features/catalogos/api';
import { useAgregarOpcion } from '../../api';

export function AltaOpcionForm({ borradorId, arbol }: { borradorId: string; arbol: VersionCatalogoConArbol | undefined }) {
  const notificar = useNotificar();
  const agregarOpcion = useAgregarOpcion(borradorId);
  const [opcion, setOpcion] = useState({ grupoId: '', clave: '', nombre: '' });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 2fr auto' }, gap: 1.5, mb: 1.5 }}>
      <TextField select label="Grupo destino" value={opcion.grupoId} onChange={(e) => setOpcion({ ...opcion, grupoId: e.target.value })}>
        {(arbol?.grupos ?? []).map((g) => (
          <MenuItem key={g.id} value={g.id}>{g.nombre}</MenuItem>
        ))}
      </TextField>
      <TextField label="Clave" value={opcion.clave} onChange={(e) => setOpcion({ ...opcion, clave: e.target.value.toUpperCase() })} />
      <TextField label="Nombre de la opción" value={opcion.nombre} onChange={(e) => setOpcion({ ...opcion, nombre: e.target.value })} />
      <Button
        variant="outlined"
        disabled={!opcion.grupoId || !opcion.clave || !opcion.nombre || agregarOpcion.isPending}
        onClick={() => {
          const g = arbol?.grupos.find((x) => x.id === opcion.grupoId);
          agregarOpcion.mutate(
            { grupoId: opcion.grupoId, clave: opcion.clave, nombre: opcion.nombre, orden: g?.opciones.length ?? 0 },
            { onSuccess: () => setOpcion({ grupoId: '', clave: '', nombre: '' }), onError: (error) => notificar.error(error) },
          );
        }}
      >
        + Opción
      </Button>
    </Box>
  );
}
