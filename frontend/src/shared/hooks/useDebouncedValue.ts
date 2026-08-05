import { useEffect, useState } from 'react';

/** Retrasa la propagación de `valor` `delayMs`; cada cambio reinicia el retraso. */
export function useDebouncedValue<T>(valor: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), delayMs);
    return () => clearTimeout(id);
  }, [valor, delayMs]);

  return debounced;
}
