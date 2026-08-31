import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Tramite = components['schemas']['Tramite'];
export type TramiteDetalle = components['schemas']['TramiteDetalle'];
export type CrearTramite = components['schemas']['CrearTramite'];

export type AccionTramite = 'iniciar-validacion' | 'aprobar' | 'rechazar' | 'expirar' | 'finalizar';

// Folio de presentación de un trámite (formato del prototipo: NA-2026-02038).
// No confundir con el folioUnico de la constancia (GSTS-...).
export function folioTramite(t: Pick<Tramite, 'tipoConstancia' | 'numeroTramite' | 'createdAt'>): string {
  const prefijo = t.tipoConstancia === 'NO_ADEUDO' ? 'NA' : 'NR';
  const anio = new Date(t.createdAt).getFullYear();
  return `${prefijo}-${anio}-${String(t.numeroTramite).padStart(5, '0')}`;
}

// `folio` es excluyente en el backend: cuando viene, el resto de los filtros se
// ignora. La UI lo refleja deshabilitando los demás campos, pero la regla la
// impone el servidor, no la pantalla.
export interface FiltrosTramites {
  estado?: Tramite['estado'];
  tipoConstancia?: Tramite['tipoConstancia'];
  nis?: string;
  folio?: string;
  desde?: string;
  hasta?: string;
}

export const tramitesInfiniteOptions = (filtros: FiltrosTramites, take = 25) =>
  infiniteQueryOptions({
    queryKey: ['tramites', filtros, take],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.GET('/tramites', {
        params: {
          query: {
            take,
            cursor: pageParam,
            ...(filtros.folio ? { folio: filtros.folio } : {}),
            ...(filtros.estado ? { estado: filtros.estado } : {}),
            ...(filtros.tipoConstancia ? { tipoConstancia: filtros.tipoConstancia } : {}),
            ...(filtros.nis ? { nis: filtros.nis } : {}),
            ...(filtros.desde ? { desde: `${filtros.desde}T00:00:00.000Z` } : {}),
            ...(filtros.hasta ? { hasta: `${filtros.hasta}T23:59:59.999Z` } : {}),
          },
        },
      });
      return data!;
    },
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
  });

export const tramiteOptions = (id: string) =>
  queryOptions({
    queryKey: ['tramites', id],
    queryFn: async () => {
      const { data } = await api.GET('/tramites/{id}', { params: { path: { id } } });
      return data!.data as TramiteDetalle;
    },
  });

export function useCrearTramite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CrearTramite) => {
      const { data } = await api.POST('/tramites', { body: input });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites'] }),
  });
}

export function useTransicionarTramite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accion, motivo }: { accion: AccionTramite; motivo?: string }) => {
      const { data } = await api.POST('/tramites/{id}/{accion}', {
        params: { path: { id, accion } },
        body: motivo ? { motivo } : {},
      });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites'] }),
  });
}
