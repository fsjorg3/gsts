import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, nuevaIdempotencyKey } from '@/api/client';
import type { components } from '@/api/schema';
import { archivoABase64 } from '@/features/evidencias/api';

export type Tarifa = components['schemas']['Tarifa'];
export type BorradorCobro = components['schemas']['BorradorCobro'];
export type CobroRespuesta = components['schemas']['CobroRespuesta'];
export type GuardarBorrador = components['schemas']['GuardarBorradorCobro'];
export type CobroRequest = components['schemas']['CobroRequest'];

// El comprobante viaja como File en la UI; el hook lo convierte a Base64 (mismo
// helper compartido que evidencias/constancias) recién al momento de enviarlo.
async function comprobanteAJson(archivo: File) {
  return { base64: await archivoABase64(archivo), nombreOriginal: archivo.name, mimeType: archivo.type };
}

export const tarifasActivasOptions = (tipo: 'NO_ADEUDO' | 'NO_REGISTRO') =>
  queryOptions({
    queryKey: ['tarifas', 'activas', tipo],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.GET('/catalogos/tarifas/activas', { params: { query: { tipo } } });
      return data!.data as Tarifa[];
    },
  });

export const borradoresOptions = (tramiteId: string) =>
  queryOptions({
    queryKey: ['tramites', tramiteId, 'borradores'],
    queryFn: async () => {
      const { data } = await api.GET('/tramites/{id}/borradores-cobro', { params: { path: { id: tramiteId } } });
      return data!.data as BorradorCobro[];
    },
  });

export function useGuardarBorrador(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // Crea el borrador ABIERTO o actualiza el existente (borradorId). `comprobante`
    // llega como File crudo; se convierte a Base64 aquí, no en el componente.
    mutationFn: async ({ borradorId, valores }: { borradorId?: string; valores: Omit<GuardarBorrador, 'comprobante'> & { comprobante?: File } }) => {
      const { comprobante, ...resto } = valores;
      const body: GuardarBorrador = { ...resto, ...(comprobante ? { comprobante: await comprobanteAJson(comprobante) } : {}) };
      if (borradorId) {
        const { data } = await api.PATCH('/tramites/{id}/borradores-cobro/{borradorId}', {
          params: { path: { id: tramiteId, borradorId } },
          body,
        });
        return data!.data as BorradorCobro;
      }
      const { data } = await api.POST('/tramites/{id}/borradores-cobro', {
        params: { path: { id: tramiteId } },
        body,
      });
      return data!.data as BorradorCobro;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}

export function useAplicarBorrador(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (borradorId: string) => {
      const { data } = await api.POST('/tramites/{id}/borradores-cobro/{borradorId}/aplicar', {
        params: { path: { id: tramiteId, borradorId } },
        headers: { 'idempotency-key': nuevaIdempotencyKey() },
      });
      return data!.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tramites'] });
    },
  });
}

export function useCobroDirecto(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<CobroRequest, 'comprobante'> & { comprobante?: File }) => {
      const { comprobante, ...resto } = input;
      const body: CobroRequest = { ...resto, ...(comprobante ? { comprobante: await comprobanteAJson(comprobante) } : {}) };
      const { data } = await api.POST('/tramites/{id}/cobros', {
        params: { path: { id: tramiteId } },
        headers: { 'idempotency-key': nuevaIdempotencyKey() },
        body,
      });
      return data!.data as CobroRespuesta;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tramites'] });
    },
  });
}
