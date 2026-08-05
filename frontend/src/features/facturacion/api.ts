import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type SolicitudFactura = components['schemas']['SolicitudFactura'];

// Resolución de solicitudes públicas (rol finanzas). Los hooks están listos,
// pero la bandeja llega con datos de demostración: el backend aún no expone
// GET de solicitudes (ver documentacion/PENDIENTES_BACKEND_FRONTEND.md).
export function useAceptarSolicitud() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.POST('/facturas/solicitudes/{id}/aceptar', { params: { path: { id } } });
      return data!.data;
    },
  });
}

export function useRechazarSolicitud() {
  return useMutation({
    mutationFn: async ({ id, motivoRechazo }: { id: string; motivoRechazo: string }) => {
      const { data } = await api.POST('/facturas/solicitudes/{id}/rechazar', {
        params: { path: { id } },
        body: { motivoRechazo },
      });
      return data!.data as SolicitudFactura;
    },
  });
}
