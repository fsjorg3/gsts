import { queryOptions } from '@tanstack/react-query';
import { api } from '@/api/client';
import { esApiError } from '@/api/errors';
import type { components } from '@/api/schema';

export type PadronRegistro = components['schemas']['PadronRegistro'];

// Debajo de esta longitud no vale la pena consultar: evita una ronda de red
// por cada tecla mientras ventanilla todavía está escribiendo el NIS.
export const NIS_LONGITUD_MINIMA_PADRON = 4;

/**
 * Catálogo offline del padrón de usuarios: resuelve nombre y domicilio por
 * NIS para No Adeudo mientras la integración real con OUC sigue bloqueada.
 * Un 404 es una respuesta válida y esperada (el NIS no está en el catálogo
 * offline) — se traduce a `null`, no a un error, para que quien consuma la
 * query distinga "buscando" / "no encontrado" / "error real".
 */
export const padronPorNisOptions = (nis: string) => {
  const nisTrim = nis.trim();
  return queryOptions({
    queryKey: ['padron', nisTrim],
    enabled: nisTrim.length >= NIS_LONGITUD_MINIMA_PADRON,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<PadronRegistro | null> => {
      try {
        const { data } = await api.GET('/padron/{nis}', { params: { path: { nis: nisTrim } } });
        return data!.data as PadronRegistro;
      } catch (error) {
        if (esApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
  });
};
