import { useCallback, useState } from 'react';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';

/** Forma mínima de una página del contrato: `{ data, meta.nextCursor?, meta.total? }`. */
export interface PaginaListado<Fila> {
  data: Fila[];
  meta?: { nextCursor?: string; total?: number } | undefined;
}

export interface PaginacionCursor<Fila> {
  pagina: number;
  filas: Fila[];
  /** Total de registros del filtro; `-1` es el valor con que MUI representa «desconocido». */
  total: number;
  irAPagina: (destino: number) => void;
  reiniciar: () => void;
  cargando: boolean;
}

/**
 * Adapta un `useInfiniteQuery` con paginación por cursor a un paginador clásico.
 *
 * El backend pagina por cursor, no por offset: la página *n* sólo se alcanza
 * recorriendo las anteriores. Por eso se puede avanzar de a una, retroceder
 * (las páginas previas ya están en caché) y volver a la primera, pero no saltar
 * a la última — quien renderiza esto no debe ofrecer ese botón.
 */
export function usePaginacionCursor<Fila>(
  consulta: UseInfiniteQueryResult<InfiniteData<PaginaListado<Fila>>, unknown>,
): PaginacionCursor<Fila> {
  const [pagina, setPagina] = useState(0);
  const paginas = consulta.data?.pages;
  const { fetchNextPage, hasNextPage } = consulta;

  const irAPagina = useCallback(
    (destino: number) => {
      if (destino < 0) return;
      if (destino < (paginas?.length ?? 0)) {
        setPagina(destino);
        return;
      }
      if (!hasNextPage) return;
      void fetchNextPage().then(() => setPagina(destino));
    },
    [paginas?.length, hasNextPage, fetchNextPage],
  );

  const reiniciar = useCallback(() => setPagina(0), []);

  return {
    pagina,
    filas: paginas?.[pagina]?.data ?? [],
    total: paginas?.[0]?.meta?.total ?? -1,
    irAPagina,
    reiniciar,
    cargando: consulta.isPending || consulta.isFetchingNextPage,
  };
}
