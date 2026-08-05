import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type ValidacionNoAdeudo = components['schemas']['ValidacionNoAdeudo'];

export interface RegistrarValidacion {
  momento: 'VALIDACION_INICIAL' | 'REVALIDACION_COBRO';
  resultado: 'SIN_ADEUDO' | 'CON_ADEUDO';
  adeudoMonto?: number;
  referenciaOuc?: string;
}

// Registro manual del cruce con el OUC (no hay integración automática: el
// puerto OUC no tiene implementación). metodo siempre MANUAL.
export function useRegistrarValidacion(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarValidacion) => {
      const { data } = await api.POST('/tramites/{id}/validaciones/no-adeudo', {
        params: { path: { id: tramiteId } },
        body: { metodo: 'MANUAL', ...input },
      });
      return data!.data as ValidacionNoAdeudo;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}
