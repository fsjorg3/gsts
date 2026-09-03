import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { MsIcon } from '@/shared/components';

/** Botón-ícono compacto de editar/eliminar para un nodo del árbol. */
export function AccionesNodo({ onEditar, onEliminar }: { onEditar: () => void; onEliminar: () => void }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: 0.25, ml: 'auto' }}>
      <IconButton size="small" onClick={onEditar} aria-label="Editar"><MsIcon name="edit" size={16} /></IconButton>
      <IconButton size="small" color="error" onClick={onEliminar} aria-label="Eliminar"><MsIcon name="delete" size={16} /></IconButton>
    </Box>
  );
}
