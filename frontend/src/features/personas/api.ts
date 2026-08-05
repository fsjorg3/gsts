import { queryOptions, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Persona = components['schemas']['Persona'];
export type CrearPersona = components['schemas']['CrearPersona'];

export const personasSearchOptions = (search: string) =>
  queryOptions({
    queryKey: ['personas', 'search', search],
    enabled: search.trim().length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.GET('/personas', { params: { query: { search, take: 10 } } });
      return data!.data as Persona[];
    },
  });

export function useCrearPersona() {
  return useMutation({
    mutationFn: async (input: CrearPersona) => {
      const { data } = await api.POST('/personas', { body: input });
      return data!.data as Persona;
    },
  });
}
