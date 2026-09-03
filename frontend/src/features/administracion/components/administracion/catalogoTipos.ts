import type { GrupoConArbol } from '@/features/catalogos/api';

export type OpcionNodo = GrupoConArbol['opciones'][number];
export type DocumentoNodo = OpcionNodo['documentos'][number];

// El select vacío ('') representa "Todos/Todas". En edición se traduce a null
// para *limpiar* el filtro (a diferencia del alta, donde se omite el campo).
export type FiltroGrupo = '' | 'NO_ADEUDO' | 'NO_REGISTRO';
export type FiltroPersonalidad = '' | 'FISICA' | 'MORAL';
export type FiltroRepresentacion = '' | 'TITULAR' | 'REPRESENTANTE' | 'APODERADO';

// Qué nodo se edita (modal) y qué se elimina (confirmación). El borrado del
// borrador completo se marca con nivel 'borrador'.
export type NodoEditando =
  | { nivel: 'grupo'; nodo: GrupoConArbol }
  | { nivel: 'opcion'; nodo: OpcionNodo }
  | { nivel: 'documento'; nodo: DocumentoNodo };

export interface NodoEliminando {
  nivel: 'grupo' | 'opcion' | 'documento' | 'borrador';
  id: string;
  titulo: string;
  mensaje: string;
}
