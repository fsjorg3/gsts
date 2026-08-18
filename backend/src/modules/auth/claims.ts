import { rolesCliente, rolesRealm, type RoleSicef } from '@gsts/contracts';
import { AppError } from '../../shared/errors.js';

export interface GstsClaims {
  sub: string;
  roles: RoleSicef[];
}

type TokenPayload = {
  sub?: unknown;
  resource_access?: Record<string, { roles?: unknown } | undefined>;
  realm_access?: { roles?: unknown };
};

// Conserva sólo los roles permitidos para la fuente indicada. Así un `ti`
// colocado por error en `resource_access.<clienteId>.roles` (o un `ventanilla`
// en `realm_access.roles`) no otorga permisos.
function rolesDesde(value: unknown, permitidos: readonly RoleSicef[]): RoleSicef[] {
  if (!Array.isArray(value)) return [];
  return value.filter((role): role is RoleSicef => typeof role === 'string' && (permitidos as readonly string[]).includes(role));
}

// `clienteId` es el mismo valor que `env.KEYCLOAK_CLIENT_ID`: Keycloak agrupa
// los roles de cliente bajo `resource_access[client_id].roles`, así que el
// nombre del cliente no puede quedar fijo en el código.
export function resolveGstsClaims(payload: TokenPayload, clienteId: string): GstsClaims {
  if (typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new AppError(401, 'INVALID_TOKEN', 'El token no contiene un sub válido');
  }
  const roles = [
    ...rolesDesde(payload.resource_access?.[clienteId]?.roles, rolesCliente),
    ...rolesDesde(payload.realm_access?.roles, rolesRealm),
  ];
  if (roles.length === 0) throw new AppError(403, 'MISSING_ROLE', 'El token no contiene un rol autorizado para SICEF');
  return { sub: payload.sub, roles: [...new Set(roles)] };
}
