import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { archivoABase64 } from '@/features/evidencias/api';
import type { TramiteDetalle } from '@/features/tramites/api';

export type ValidacionNoAdeudo = components['schemas']['ValidacionNoAdeudo'];
export type ValidacionNoRegistro = components['schemas']['ValidacionNoRegistro'];

async function evidenciaOucAJson(archivo: File) {
  return { base64: await archivoABase64(archivo), nombreOriginal: archivo.name, mimeType: archivo.type };
}

export interface RegistrarValidacion {
  momento: 'VALIDACION_INICIAL' | 'REVALIDACION_COBRO';
  resultado: 'SIN_ADEUDO' | 'CON_ADEUDO';
  adeudoMonto?: number;
  evidenciaOuc: File;
}

// Registro manual del cruce con el OUC (no hay integración automática: el
// puerto OUC no tiene implementación). metodo siempre MANUAL. La evidencia
// (foto/captura de la consulta) es obligatoria: un folio de texto libre no
// era verificable.
export function useRegistrarValidacion(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evidenciaOuc, ...resto }: RegistrarValidacion) => {
      const { data } = await api.POST('/tramites/{id}/validaciones/no-adeudo', {
        params: { path: { id: tramiteId } },
        body: { metodo: 'MANUAL', ...resto, evidenciaOuc: await evidenciaOucAJson(evidenciaOuc) },
      });
      return data!.data as ValidacionNoAdeudo;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}

export interface RegistrarValidacionNoRegistro {
  momento: 'VALIDACION_INICIAL' | 'REVALIDACION_COBRO';
  resultado: 'SIN_REGISTRO' | 'CON_REGISTRO';
  evidenciaOuc: File;
}

// Gemelo de useRegistrarValidacion para No Registro: path y resultado propios.
// A propósito NO se unifican: el tipo de `resultado` es lo que impide mandar el
// resultado equivocado al endpoint equivocado. Sin `adeudoMonto`.
export function useRegistrarValidacionNoRegistro(tramiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evidenciaOuc, ...resto }: RegistrarValidacionNoRegistro) => {
      const { data } = await api.POST('/tramites/{id}/validaciones/no-registro', {
        params: { path: { id: tramiteId } },
        body: { metodo: 'MANUAL', ...resto, evidenciaOuc: await evidenciaOucAJson(evidenciaOuc) },
      });
      return data!.data as ValidacionNoRegistro;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tramites', tramiteId] }),
  });
}

// Descarga de la evidencia OUC ya adjuntada a una validación. Mismo patrón que
// useDescargarEvidencia/useDescargarComprobante: cliente tipado + parseAs 'blob'.
export function useDescargarEvidenciaValidacion(tramiteId: string) {
  return useMutation({
    mutationFn: async (momento: 'VALIDACION_INICIAL' | 'REVALIDACION_COBRO') => {
      const { data } = await api.GET('/tramites/{id}/validaciones/no-adeudo/archivo', {
        params: { path: { id: tramiteId }, query: { momento } },
        parseAs: 'blob',
      });
      return data as Blob;
    },
  });
}

export function useDescargarEvidenciaValidacionNoRegistro(tramiteId: string) {
  return useMutation({
    mutationFn: async (momento: 'VALIDACION_INICIAL' | 'REVALIDACION_COBRO') => {
      const { data } = await api.GET('/tramites/{id}/validaciones/no-registro/archivo', {
        params: { path: { id: tramiteId }, query: { momento } },
        parseAs: 'blob',
      });
      return data as Blob;
    },
  });
}

// --- Predicados de estado por tipo ---
// Cada tipo mira su propio arreglo con su propio resultado positivo. Son
// lecturas puras (no unifican la mutación): centralizan el "según el tipo, mira
// el arreglo que corresponde" que necesitan el wizard y el paso de cobro.
type TramiteValidaciones = Pick<TramiteDetalle, 'tipoConstancia' | 'validacionesNoAdeudo' | 'validacionesNoRegistro'>;

function tiene(tramite: TramiteValidaciones, momento: 'VALIDACION_INICIAL' | 'REVALIDACION_COBRO', positivo: boolean): boolean {
  return tramite.tipoConstancia === 'NO_ADEUDO'
    ? tramite.validacionesNoAdeudo.some((v) => v.momento === momento && v.resultado === (positivo ? 'SIN_ADEUDO' : 'CON_ADEUDO'))
    : tramite.validacionesNoRegistro.some((v) => v.momento === momento && v.resultado === (positivo ? 'SIN_REGISTRO' : 'CON_REGISTRO'));
}

/** Validación inicial con resultado positivo (habilita la aprobación). */
export function tieneValidacionInicial(tramite: TramiteValidaciones): boolean {
  return tiene(tramite, 'VALIDACION_INICIAL', true);
}

/** Revalidación al cobro con resultado positivo (habilita el cobro). */
export function tieneRevalidacion(tramite: TramiteValidaciones): boolean {
  return tiene(tramite, 'REVALIDACION_COBRO', true);
}

/** Revalidación al cobro con hallazgo negativo (adeudo/registro sobrevenido). */
export function tieneRevalidacionNegativa(tramite: TramiteValidaciones): boolean {
  return tiene(tramite, 'REVALIDACION_COBRO', false);
}
