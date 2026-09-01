import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Mantiene los filtros aplicados de una pantalla en el query string, para que
 * una búsqueda se pueda compartir, recargar y recuperar tras volver a iniciar
 * sesión (ver `returnTo` en auth/oidc.ts).
 *
 * Escribe con `replace`, no `push`: cada búsqueda como entrada de historial
 * obligaría a pulsar «Atrás» tantas veces como búsquedas se hicieron para
 * salir de la pantalla.
 *
 * Sólo viven aquí los filtros, nunca el número de página: la API pagina por
 * cursor —la página 3 sólo se alcanza recorriendo la 1 y la 2—, así que una URL
 * que prometiera `?pagina=3` mentiría al abrirse en frío.
 */
export function useFiltrosUrl<Clave extends string>(claves: readonly Clave[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Se recalcula con la URL, así que Atrás/Adelante y el regreso desde Keycloak
  // se reflejan solos, sin efectos que sincronicen estado.
  const filtros = useMemo(() => {
    const leidos = {} as Partial<Record<Clave, string>>;
    for (const clave of claves) {
      const valor = searchParams.get(clave);
      if (valor !== null && valor !== '') leidos[clave] = valor;
    }
    return leidos;
    // searchParams cambia de identidad en cada navegación; `claves` es literal por pantalla.
  }, [searchParams, claves]);

  const aplicar = useCallback(
    (nuevos: Partial<Record<Clave, string>>) => {
      const params = new URLSearchParams();
      for (const clave of claves) {
        const valor = nuevos[clave];
        if (valor !== undefined && valor !== '') params.set(clave, valor);
      }
      setSearchParams(params, { replace: true });
    },
    [claves, setSearchParams],
  );

  const limpiar = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  return { filtros, aplicar, limpiar };
}
