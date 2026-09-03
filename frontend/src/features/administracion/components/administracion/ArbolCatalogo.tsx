import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { VersionCatalogoConArbol } from '@/features/catalogos/api';
import { AccionesNodo } from './AccionesNodo';
import type { NodoEditando, NodoEliminando } from './catalogoTipos';

/** Vista de sólo lectura del árbol grupo → opción → documento de un borrador. */
export function ArbolCatalogo({ arbol, onEditar, onEliminar }: {
  arbol: VersionCatalogoConArbol | undefined;
  onEditar: (nodo: NodoEditando) => void;
  onEliminar: (payload: NodoEliminando) => void;
}) {
  if (!arbol || arbol.grupos.length === 0) {
    return <Typography variant="body2" sx={{ color: 'text.disabled', mb: 2 }}>Sin grupos todavía.</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
      {arbol.grupos.map((g) => {
        const totalDocs = g.opciones.reduce((n, o) => n + o.documentos.length, 0);
        return (
          <Box key={g.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0.75, p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {g.nombre} <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>({g.clave}
                {g.aplicaTipo ? ` · ${g.aplicaTipo}` : ''}{g.aplicaPersonalidad ? ` · ${g.aplicaPersonalidad}` : ''}
                {g.aplicaRepresentacion ? ` · ${g.aplicaRepresentacion}` : ''})</Box>
              </Typography>
              <AccionesNodo
                onEditar={() => onEditar({ nivel: 'grupo', nodo: g })}
                onEliminar={() => onEliminar({ nivel: 'grupo', id: g.id, titulo: 'Quitar grupo', mensaje: `Se eliminará «${g.clave}» con sus ${g.opciones.length} opción(es) y ${totalDocs} documento(s). Esta acción no se puede deshacer.` })}
              />
            </Box>
            {g.opciones.map((o) => (
              <Box key={o.id} sx={{ pl: 2, mt: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>◦ {o.nombre} ({o.clave})</Typography>
                  <AccionesNodo
                    onEditar={() => onEditar({ nivel: 'opcion', nodo: o })}
                    onEliminar={() => onEliminar({ nivel: 'opcion', id: o.id, titulo: 'Quitar opción', mensaje: `Se eliminará «${o.clave}» con sus ${o.documentos.length} documento(s). Esta acción no se puede deshacer.` })}
                  />
                </Box>
                {o.documentos.map((d) => (
                  <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 2 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>· {d.nombre}</Typography>
                    <AccionesNodo
                      onEditar={() => onEditar({ nivel: 'documento', nodo: d })}
                      onEliminar={() => onEliminar({ nivel: 'documento', id: d.id, titulo: 'Quitar documento', mensaje: `Se eliminará «${d.nombre}». Esta acción no se puede deshacer.` })}
                    />
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
