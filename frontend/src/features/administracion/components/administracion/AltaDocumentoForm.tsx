import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useNotificar } from '@/store/useNotificar';
import type { VersionCatalogoConArbol } from '@/features/catalogos/api';
import { useAgregarDocumento } from '../../api';

export function AltaDocumentoForm({ borradorId, arbol }: { borradorId: string; arbol: VersionCatalogoConArbol | undefined }) {
  const notificar = useNotificar();
  const agregarDocumento = useAgregarDocumento(borradorId);
  const [documento, setDocumento] = useState({ opcionId: '', nombre: '' });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 3fr auto' }, gap: 1.5 }}>
      <TextField select label="Opción destino" value={documento.opcionId} onChange={(e) => setDocumento({ ...documento, opcionId: e.target.value })}>
        {(arbol?.grupos ?? []).flatMap((g) => g.opciones.map((o) => (
          <MenuItem key={o.id} value={o.id}>{g.nombre} → {o.nombre}</MenuItem>
        )))}
      </TextField>
      <TextField label="Nombre del documento" value={documento.nombre} onChange={(e) => setDocumento({ ...documento, nombre: e.target.value })} />
      <Button
        variant="outlined"
        disabled={!documento.opcionId || !documento.nombre || agregarDocumento.isPending}
        onClick={() => {
          const o = arbol?.grupos.flatMap((g) => g.opciones).find((x) => x.id === documento.opcionId);
          agregarDocumento.mutate(
            { opcionId: documento.opcionId, nombre: documento.nombre, orden: o?.documentos.length ?? 0 },
            { onSuccess: () => setDocumento({ opcionId: '', nombre: '' }), onError: (error) => notificar.error(error) },
          );
        }}
      >
        + Documento
      </Button>
    </Box>
  );
}
