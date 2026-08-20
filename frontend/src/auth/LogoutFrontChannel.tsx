import { useEffect } from 'react';
import { userManager } from './oidc';

// Front-channel logout callback (OIDC): Keycloak carga esta URL en un iframe
// oculto, en la pestaña donde se originó el logout, cuando la sesión SSO se
// cierra desde CUALQUIER cliente del realm SOAPAP (incluido GSTS mismo).
// Por ser sessionStorage (oidc.ts, aislado por pestaña), esto limpia la
// sesión para pestañas nuevas/recargadas de GSTS, pero NO una pestaña de GSTS
// que ya esté abierta en background — esa seguirá con su token hasta que
// expire. Debe registrarse como "Front-channel logout URL" del cliente `gsts`
// en Keycloak (Admin Console → Clients → gsts → Logout settings) — pendiente
// de configurar en producción. nginx además restringe, fuera de este repo,
// qué host puede embeber esta ruta en un iframe.
export function LogoutFrontChannel() {
  useEffect(() => {
    const iss = new URLSearchParams(window.location.search).get('iss');
    if (iss && iss !== import.meta.env.VITE_KEYCLOAK_AUTHORITY) return;
    void userManager.removeUser();
  }, []);
  return null;
}
