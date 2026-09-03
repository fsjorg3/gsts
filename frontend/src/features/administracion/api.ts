import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type ConfiguracionPlazos = components['schemas']['ConfiguracionPlazos'];
export type ConfiguracionConstancia = components['schemas']['ConfiguracionConstancia'];
export type TipoConstancia = ConfiguracionConstancia['tipoConstancia'];
export type VersionCatalogo = components['schemas']['VersionCatalogo'];
export type Tarifa = components['schemas']['Tarifa'];
export type CatalogoValidacion = components['schemas']['CatalogoValidacion'];

export const plazosOptions = queryOptions({
  queryKey: ['administracion', 'plazos'],
  queryFn: async () => {
    const { data } = await api.GET('/administracion/plazos');
    return (data!.data ?? null) as ConfiguracionPlazos | null;
  },
});

export function useGuardarPlazos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plazoPagoDias: number }) => {
      const { data } = await api.PUT('/administracion/plazos', { body: { ...input, activa: true } });
      return data!.data as ConfiguracionPlazos;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['administracion', 'plazos'] }),
  });
}

// --- Configuración de constancias (vigencia y firmante impresos en el PDF) ---
// Devuelve null si nunca se configuró ese tipo: sin configuración el backend
// rechaza la emisión con CONSTANCIA_CONFIG_NOT_SET.

export const configuracionConstanciaOptions = (tipo: TipoConstancia) =>
  queryOptions({
    queryKey: ['administracion', 'constancias', tipo],
    queryFn: async () => {
      const { data } = await api.GET('/administracion/constancias/{tipo}', { params: { path: { tipo } } });
      return (data!.data ?? null) as ConfiguracionConstancia | null;
    },
  });

export function useGuardarConfiguracionConstancia(tipo: TipoConstancia) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { vigenciaDias: number; firmanteNombre: string; firmanteCargo: string }) => {
      const { data } = await api.PUT('/administracion/constancias/{tipo}', { params: { path: { tipo } }, body: input });
      return data!.data as ConfiguracionConstancia;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['administracion', 'constancias', tipo] }),
  });
}

// --- Asistente de catálogo de requisitos ---

export function useCrearCatalogo() {
  return useMutation({
    mutationFn: async (input: { version: number; clonarDesdeId?: string }) => {
      const { data } = await api.POST('/catalogos/requisitos', { body: input });
      return data!.data as VersionCatalogo;
    },
  });
}

export function useAgregarGrupo(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clave: string;
      nombre: string;
      orden: number;
      aplicaTipo?: 'NO_ADEUDO' | 'NO_REGISTRO';
      aplicaPersonalidad?: 'FISICA' | 'MORAL';
      aplicaRepresentacion?: 'TITULAR' | 'REPRESENTANTE' | 'APODERADO';
    }) => {
      const { data } = await api.POST('/catalogos/requisitos/{id}/grupos', { params: { path: { id: catalogoId } }, body: input });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useAgregarOpcion(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ grupoId, ...input }: { grupoId: string; clave: string; nombre: string; orden: number }) => {
      const { data } = await api.POST('/catalogos/grupos/{id}/opciones', { params: { path: { id: grupoId } }, body: input });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useAgregarDocumento(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ opcionId, ...input }: { opcionId: string; nombre: string; orden: number }) => {
      const { data } = await api.POST('/catalogos/opciones/{id}/documentos', { params: { path: { id: opcionId } }, body: input });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

// --- Edición y borrado del borrador ---
// El id del path es el de la entidad hija (grupo/opción/documento); el
// `catalogoId` va aparte sólo para invalidar la vista previa del árbol.
// En ActualizarGrupo los `aplica*` aceptan null (limpiar el filtro), a
// diferencia del alta, donde se omiten.

type ActualizarGrupo = components['schemas']['ActualizarGrupo'];
type ActualizarOpcion = components['schemas']['ActualizarOpcion'];
type ActualizarDocumento = components['schemas']['ActualizarDocumento'];

export function useEditarGrupo(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ActualizarGrupo & { id: string }) => {
      const { data } = await api.PATCH('/catalogos/grupos/{id}', { params: { path: { id } }, body });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useEditarOpcion(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ActualizarOpcion & { id: string }) => {
      const { data } = await api.PATCH('/catalogos/opciones/{id}', { params: { path: { id } }, body });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useEditarDocumento(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ActualizarDocumento & { id: string }) => {
      const { data } = await api.PATCH('/catalogos/documentos/{id}', { params: { path: { id } }, body });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useEliminarGrupo(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.DELETE('/catalogos/grupos/{id}', { params: { path: { id } } });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useEliminarOpcion(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.DELETE('/catalogos/opciones/{id}', { params: { path: { id } } });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

export function useEliminarDocumento(catalogoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.DELETE('/catalogos/documentos/{id}', { params: { path: { id } } });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'vista-previa', catalogoId] }),
  });
}

// Descarta el borrador completo (con sus grupos/opciones/documentos). Ya no
// existe su vista previa: se invalida la lista de versiones.
export function useDescartarBorrador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (catalogoId: string) => {
      const { data } = await api.DELETE('/catalogos/requisitos/{id}', { params: { path: { id: catalogoId } } });
      return data!.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'lista'] }),
  });
}

export function useValidarCatalogo() {
  return useMutation({
    mutationFn: async (catalogoId: string) => {
      const { data } = await api.GET('/catalogos/requisitos/{id}/validar', { params: { path: { id: catalogoId } } });
      return data!.data as CatalogoValidacion;
    },
  });
}

export function usePublicarCatalogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (catalogoId: string) => {
      const { data } = await api.POST('/catalogos/requisitos/{id}/publicar', { params: { path: { id: catalogoId } } });
      return data!.data as VersionCatalogo;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalogos'] }),
  });
}

// --- Tarifas ---

export function useCrearTarifa() {
  return useMutation({
    mutationFn: async (input: { tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO'; concepto: string; monto: number; version: number }) => {
      const { data } = await api.POST('/catalogos/tarifas', { body: input });
      return data!.data as Tarifa;
    },
  });
}

export function usePublicarTarifa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tarifaId: string) => {
      const { data } = await api.POST('/catalogos/tarifas/{id}/publicar', { params: { path: { id: tarifaId } } });
      return data!.data as Tarifa;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tarifas'] }),
  });
}
