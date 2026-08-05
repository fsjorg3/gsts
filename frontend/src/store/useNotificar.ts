import { useCallback } from 'react';
import { copyDeError } from '@/api/errors';
import { useAppDispatch } from './hooks';
import { notify } from './notificationsSlice';

// Helpers para notificar desde mutaciones: éxito con copy propio, error
// traducido por el catálogo de códigos del contrato.
export function useNotificar() {
  const dispatch = useAppDispatch();

  const exito = useCallback(
    (message: string) => dispatch(notify({ severity: 'success', message })),
    [dispatch],
  );

  const error = useCallback(
    (causa: unknown) => dispatch(notify({ severity: 'error', message: copyDeError(causa) })),
    [dispatch],
  );

  const info = useCallback(
    (message: string) => dispatch(notify({ severity: 'info', message })),
    [dispatch],
  );

  return { exito, error, info };
}
