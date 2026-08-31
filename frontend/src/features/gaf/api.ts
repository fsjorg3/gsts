import { queryOptions, useMutation } from '@tanstack/react-query';
import { gaf } from './client';
import type { CatalogosSatCaptura, OrigenCaptura, SolicitudDetail } from './types';

export const origenesGafOptions = () =>
  queryOptions({
    queryKey: ['gaf', 'origenes'],
    staleTime: 5 * 60_000,
    queryFn: () => gaf.get<OrigenCaptura[]>('/solicitudes/origenes'),
  });

// `fechaPago` debe consultarse con el mismo string exacto que se enviará en el
// POST: GAF resuelve las claves SAT vigentes contra esa fecha, y un desfase
// entre la consulta y el envío puede producir 503 SAT_CATALOG_UNAVAILABLE.
export const catalogosSatOptions = (fechaPago: string) =>
  queryOptions({
    queryKey: ['gaf', 'catalogos-sat', fechaPago],
    enabled: Boolean(fechaPago),
    queryFn: () => gaf.get<CatalogosSatCaptura>(`/solicitudes/catalogos-sat?fechaPago=${encodeURIComponent(fechaPago)}`),
  });

export function useCrearSolicitudGaf() {
  return useMutation({
    mutationFn: (formData: FormData) => gaf.post<SolicitudDetail>('/solicitudes', formData),
  });
}
