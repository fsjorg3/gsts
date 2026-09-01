import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { marcarSesionExpirada } from './sesion';

// Keycloak realm SOAPAP, cliente sicef — Authorization Code + PKCE.
// El UserManager se comparte entre el AuthProvider (react-oidc-context) y el
// cliente HTTP (api/client.ts) para leer el access token fuera de React.
export const userManager = new UserManager({
  authority: import.meta.env.VITE_KEYCLOAK_AUTHORITY,
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: 'code',
  scope: 'openid',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});

// react-oidc-context no escucha estos dos eventos: sin esto, un token vencido
// con la pestaña abierta deja la app creyéndose autenticada (ver sesion.ts).
// `AccessTokenExpired` cubre el caso normal —venció y el renew silencioso no lo
// salvó— sin esperar a que falle una petición.
userManager.events.addAccessTokenExpired(() => marcarSesionExpirada());
userManager.events.addSilentRenewError(() => marcarSesionExpirada());

export async function obtenerAccessToken(): Promise<string | undefined> {
  const user = await userManager.getUser();
  if (!user || user.expired) return undefined;
  return user.access_token;
}

/**
 * Ruta actual (con su query), para volver a ella tras autenticarse. Viaja en el
 * `state` del authorization request y regresa en `user.state` al callback:
 * `redirect_uri` es siempre la raíz, así que sin esto cualquier deep link —y
 * cualquier búsqueda filtrada— se pierde al entrar.
 */
export function rutaDeRegreso(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Lanza el login conservando la ruta actual. */
export async function iniciarSesion(): Promise<void> {
  await userManager.signinRedirect({ state: { returnTo: rutaDeRegreso() } });
}
