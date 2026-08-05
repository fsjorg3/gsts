import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Constancia = components['schemas']['Constancia'];

// Descarga del PDF ya emitido. Se pide con el cliente tipado y `parseAs: 'blob'`
// en vez de un fetch a pelo para conservar el middleware que inyecta el bearer y
// el que convierte respuestas no-ok en ApiError.
export function useDescargarConstancia(tramiteId: string) {
  return useMutation({
    mutationFn: async (constanciaId: string) => {
      const { data } = await api.GET('/tramites/{id}/constancias/{constanciaId}/archivo', {
        params: { path: { id: tramiteId, constanciaId } },
        parseAs: 'blob',
      });
      return data as Blob;
    },
  });
}

// Emisión de constancia: sin adjuntos. El backend genera el PDF desde la
// plantilla del tipo (con el QR de verificación estampado), toma la vigencia y
// el firmante de la configuración de Administración y registra el hash SHA-256
// del archivo. Sigue siendo falible (falta de configuración o de plantilla); el
// trámite permanece en COBRO si falla, así que se puede reintentar.
export function useEmitirConstancia(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/tramites/{id}/constancias', {
        params: { path: { id: tramiteId } },
      });
      return data!.data as Constancia;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}
