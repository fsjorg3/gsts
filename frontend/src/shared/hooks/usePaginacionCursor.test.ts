import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { usePaginacionCursor, type PaginaListado } from './usePaginacionCursor';

type Fila = { id: string };

/** Doble mínimo del resultado de useInfiniteQuery: sólo lo que el hook lee. */
function consultaFalsa(
  paginas: PaginaListado<Fila>[],
  extra: { hasNextPage?: boolean; fetchNextPage?: () => Promise<unknown> } = {},
): UseInfiniteQueryResult<InfiniteData<PaginaListado<Fila>>, unknown> {
  return {
    data: { pages: paginas, pageParams: [] },
    hasNextPage: extra.hasNextPage ?? false,
    fetchNextPage: extra.fetchNextPage ?? (() => Promise.resolve()),
    isPending: false,
    isFetchingNextPage: false,
  } as unknown as UseInfiniteQueryResult<InfiniteData<PaginaListado<Fila>>, unknown>;
}

const pagina = (id: string, total?: number): PaginaListado<Fila> => ({
  data: [{ id }],
  meta: total === undefined ? {} : { total },
});

describe('usePaginacionCursor', () => {
  it('muestra sólo la página actual, no el acumulado de páginas cargadas', () => {
    const { result } = renderHook(() => usePaginacionCursor(consultaFalsa([pagina('a'), pagina('b')])));
    expect(result.current.filas).toEqual([{ id: 'a' }]);
    act(() => result.current.irAPagina(1));
    expect(result.current.filas).toEqual([{ id: 'b' }]);
  });

  it('toma el total de la primera página y usa -1 mientras no llega', () => {
    const { result } = renderHook(() => usePaginacionCursor(consultaFalsa([pagina('a', 1204)])));
    expect(result.current.total).toBe(1204);

    const { result: sinDatos } = renderHook(() => usePaginacionCursor(consultaFalsa([])));
    expect(sinDatos.current.total).toBe(-1);
  });

  it('no vuelve a pedir una página que ya está en caché', () => {
    const fetchNextPage = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      usePaginacionCursor(consultaFalsa([pagina('a'), pagina('b')], { hasNextPage: true, fetchNextPage })),
    );
    act(() => result.current.irAPagina(1));
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(result.current.pagina).toBe(1);
  });

  it('pide la siguiente página al backend y avanza cuando llega', async () => {
    const fetchNextPage = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      usePaginacionCursor(consultaFalsa([pagina('a')], { hasNextPage: true, fetchNextPage })),
    );
    await act(async () => {
      result.current.irAPagina(1);
      await Promise.resolve();
    });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(result.current.pagina).toBe(1);
  });

  it('ignora avanzar más allá de la última página y retroceder antes de la primera', () => {
    const fetchNextPage = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      usePaginacionCursor(consultaFalsa([pagina('a')], { hasNextPage: false, fetchNextPage })),
    );
    act(() => result.current.irAPagina(1));
    act(() => result.current.irAPagina(-1));
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(result.current.pagina).toBe(0);
  });

  it('reiniciar vuelve a la primera página', () => {
    const { result } = renderHook(() => usePaginacionCursor(consultaFalsa([pagina('a'), pagina('b')])));
    act(() => result.current.irAPagina(1));
    act(() => result.current.reiniciar());
    expect(result.current.pagina).toBe(0);
  });
});
