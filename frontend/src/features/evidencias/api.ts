import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Evidencia = components['schemas']['Evidencia'];

export const MIME_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_EVIDENCIA_TOTAL_BYTES = 31_457_280; // 30 MiB, impuesto por trigger

/** Lee un File del navegador y regresa su contenido Base64 (sin prefijo dataURL). */
export function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.onload = () => {
      const resultado = lector.result as string;
      resolve(resultado.slice(resultado.indexOf(',') + 1));
    };
    lector.readAsDataURL(archivo);
  });
}

export function useActualizarEvidencia(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { evidenciaId: string; estado: 'VALIDADO' | 'RECHAZADO' }) => {
      const { data } = await api.PATCH('/tramites/{id}/evidencias/{evidenciaId}', {
        params: { path: { id: tramiteId, evidenciaId: input.evidenciaId } },
        body: { estado: input.estado },
      });
      return data!.data as Evidencia;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}

export function useSubirEvidencia(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { opcionDocumentoId: string; archivo: File }) => {
      const contenidoBase64 = await archivoABase64(input.archivo);
      const { data } = await api.POST('/tramites/{id}/evidencias', {
        params: { path: { id: tramiteId } },
        body: {
          opcionDocumentoId: input.opcionDocumentoId,
          nombreOriginal: input.archivo.name,
          mimeType: input.archivo.type,
          contenidoBase64,
        },
      });
      return data!.data as Evidencia;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}
