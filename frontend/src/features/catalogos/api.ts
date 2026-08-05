import { queryOptions } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type VersionCatalogoConArbol = components['schemas']['VersionCatalogoConArbol'];
export type GrupoConArbol = VersionCatalogoConArbol['grupos'][number];
export type VersionCatalogo = components['schemas']['VersionCatalogo'];

// Catálogo de requisitos activo. Ojo: el checklist aplicable a un trámite ya
// creado usa la versión estampada en el trámite (versionCatalogoId); mientras
// coincida con la activa este árbol es válido. Para versiones históricas se
// usa /catalogos/requisitos/{id}/vista-previa.
export const catalogoActivoOptions = queryOptions({
  queryKey: ['catalogos', 'activo'],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data } = await api.GET('/catalogos/requisitos/activo');
    return (data!.data ?? null) as VersionCatalogoConArbol | null;
  },
});

// Todas las versiones (publicadas o no). Rol ti: permite ver borradores
// abandonados y evitar chocar con el UNIQUE de `version` al crear uno nuevo.
export const catalogosListaOptions = queryOptions({
  queryKey: ['catalogos', 'lista'],
  queryFn: async () => {
    const { data } = await api.GET('/catalogos/requisitos', { params: { query: { take: 100 } } });
    return data!.data as VersionCatalogo[];
  },
});

export const catalogoVistaPreviaOptions = (id: string) =>
  queryOptions({
    queryKey: ['catalogos', 'vista-previa', id],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.GET('/catalogos/requisitos/{id}/vista-previa', { params: { path: { id } } });
      return data!.data as VersionCatalogoConArbol;
    },
  });

export interface FiltroAplicabilidad {
  tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO';
  personalidad: 'FISICA' | 'MORAL';
  representacion: 'TITULAR' | 'REPRESENTANTE' | 'APODERADO';
}

// Regla Y/O/Y del contrato: NULL en una dimensión = aplica a todos sus valores.
export function gruposAplicables(catalogo: VersionCatalogoConArbol, filtro: FiltroAplicabilidad): GrupoConArbol[] {
  return catalogo.grupos.filter(
    (g) =>
      (g.aplicaTipo === null || g.aplicaTipo === filtro.tipoConstancia) &&
      (g.aplicaPersonalidad === null || g.aplicaPersonalidad === filtro.personalidad) &&
      (g.aplicaRepresentacion === null || g.aplicaRepresentacion === filtro.representacion),
  );
}
