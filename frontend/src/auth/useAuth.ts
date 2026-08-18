import { useQuery } from '@tanstack/react-query';
import { useAuth as useOidc } from 'react-oidc-context';
import { api } from '@/api/client';

// `finanzas` desapareció con el recorte de facturación. `direccion` sigue
// existiendo en el realm y en la API, pero su tablero se construye en la
// aplicación de Finanzas, no en ésta.
export type RolGsts = 'ventanilla' | 'ti' | 'direccion';

// Fuente de verdad de roles en la UI: GET /auth/me (el backend extrae cada rol
// de su fuente correcta en el token; la UI no interpreta claims de Keycloak).
export function useAuth() {
  const oidc = useOidc();

  const me = useQuery({
    queryKey: ['auth', 'me'],
    enabled: oidc.isAuthenticated,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.GET('/auth/me');
      return data!.data;
    },
  });

  const roles = (me.data?.roles ?? []) as RolGsts[];

  return {
    oidc,
    cargando: oidc.isLoading || (oidc.isAuthenticated && me.isPending),
    autenticado: oidc.isAuthenticated,
    actorId: me.data?.actorId,
    roles,
    tieneRol: (...permitidos: RolGsts[]) => permitidos.some((rol) => roles.includes(rol)),
    nombre: oidc.user?.profile.name ?? oidc.user?.profile.preferred_username ?? '—',
    cerrarSesion: () => void oidc.signoutRedirect(),
  };
}
