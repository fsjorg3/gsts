import { infiniteQueryOptions } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Bitacora = components['schemas']['Bitacora'];

// desde/hasta se capturan como fecha simple (YYYY-MM-DD) en la UI; aquí se
// amplían al inicio/fin del día en UTC para que el filtro cubra el día completo.
export interface FiltrosBitacora {
  entidad?: string;
  entidadId?: string;
  accion?: string;
  actorId?: string;
  desde?: string;
  hasta?: string;
}

export const bitacoraInfiniteOptions = (filtros: FiltrosBitacora, take = 25) =>
  infiniteQueryOptions({
    queryKey: ['bitacora', filtros, take],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.GET('/bitacora', {
        params: {
          query: {
            take,
            cursor: pageParam,
            ...(filtros.entidad ? { entidad: filtros.entidad } : {}),
            ...(filtros.entidadId ? { entidadId: filtros.entidadId } : {}),
            ...(filtros.accion ? { accion: filtros.accion } : {}),
            ...(filtros.actorId ? { actorId: filtros.actorId } : {}),
            ...(filtros.desde ? { desde: `${filtros.desde}T00:00:00.000Z` } : {}),
            ...(filtros.hasta ? { hasta: `${filtros.hasta}T23:59:59.999Z` } : {}),
          },
        },
      });
      return data!;
    },
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
  });
