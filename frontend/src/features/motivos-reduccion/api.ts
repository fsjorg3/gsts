import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type MotivoReduccion = components['schemas']['MotivoReduccion'];
export type CrearMotivoReduccion = components['schemas']['CrearMotivoReduccion'];
export type ActualizarMotivoReduccion = components['schemas']['ActualizarMotivoReduccion'];

// El backend deriva y congela el porcentaje desde este catálogo — el cliente
// nunca envía un porcentaje libre, sólo elige un motivoReduccionId (o ninguno).
export const motivosReduccionOptions = (activo?: boolean) =>
  queryOptions({
    queryKey: ['motivos-reduccion', activo ?? 'todos'],
    queryFn: async () => {
      const { data } = await api.GET('/motivos-reduccion', { params: { query: activo === undefined ? {} : { activo } } });
      return data!.data as MotivoReduccion[];
    },
  });

export function useCrearMotivoReduccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CrearMotivoReduccion) => {
      const { data } = await api.POST('/motivos-reduccion', { body: input });
      return data!.data as MotivoReduccion;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['motivos-reduccion'] }),
  });
}

export function useActualizarMotivoReduccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ActualizarMotivoReduccion & { id: string }) => {
      const { data } = await api.PATCH('/motivos-reduccion/{id}', { params: { path: { id } }, body: input });
      return data!.data as MotivoReduccion;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['motivos-reduccion'] }),
  });
}
