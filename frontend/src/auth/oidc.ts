import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

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

export async function obtenerAccessToken(): Promise<string | undefined> {
  const user = await userManager.getUser();
  if (!user || user.expired) return undefined;
  return user.access_token;
}
