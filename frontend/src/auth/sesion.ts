import { useSyncExternalStore } from 'react';

// Señal de "la sesión dejó de ser válida", compartida entre React y el
// middleware HTTP (api/client.ts), que corre fuera del árbol de componentes.
//
// Existe porque react-oidc-context no la da: calcula `isAuthenticated` como
// `!user.expired` sólo al inicializar o al recargar el usuario, y no se
// suscribe a `AccessTokenExpired`. Con la pestaña abierta, un token vencido
// deja `isAuthenticated` en `true` para siempre — el AuthGate nunca redirige y
// cada petición sale sin `Authorization`.
//
// Es de un solo sentido y sin vuelta atrás: una vez marcada, se sale de la
// pantalla volviendo a autenticarse (recarga completa), así que no hace falta
// limpiarla. Eso la hace idempotente: N peticiones que fallen a la vez
// levantan un solo diálogo.

let expirada = false;
const suscriptores = new Set<() => void>();

/** Marca la sesión como vencida. Sólo notifica la primera vez. */
export function marcarSesionExpirada(): void {
  if (expirada) return;
  expirada = true;
  for (const notificar of suscriptores) notificar();
}

function suscribir(notificar: () => void): () => void {
  suscriptores.add(notificar);
  return () => {
    suscriptores.delete(notificar);
  };
}

/** `true` en cuanto la sesión vence; nunca vuelve a `false`. */
export function useSesionExpirada(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => expirada,
    () => false,
  );
}

/** Sólo para pruebas: devuelve el módulo a su estado inicial. */
export function reiniciarSesionParaPruebas(): void {
  expirada = false;
  suscriptores.clear();
}
