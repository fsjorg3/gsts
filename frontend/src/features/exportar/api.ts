import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { FiltrosTramites } from '@/features/tramites/api';

/** GET /tramites/export: rol jefatura exclusivo, mismos filtros que Ventanilla, sin paginación. */
export function useExportarTramites() {
  return useMutation({
    mutationFn: async (filtros: FiltrosTramites) => {
      const { data } = await api.GET('/tramites/export', {
        params: {
          query: {
            ...(filtros.folio ? { folio: filtros.folio } : {}),
            ...(filtros.estado ? { estado: filtros.estado } : {}),
            ...(filtros.tipoConstancia ? { tipoConstancia: filtros.tipoConstancia } : {}),
            ...(filtros.nis ? { nis: filtros.nis } : {}),
            ...(filtros.desde ? { desde: `${filtros.desde}T00:00:00.000Z` } : {}),
            ...(filtros.hasta ? { hasta: `${filtros.hasta}T23:59:59.999Z` } : {}),
          },
        },
        parseAs: 'blob',
      });
      return data as Blob;
    },
  });
}

/** Nombre con el que se entrega el XLSX: mismo formato que arma el backend. */
export function nombreArchivoExportTramites(): string {
  return `tramites-${new Date().toISOString().slice(0, 10)}.xlsx`;
}
