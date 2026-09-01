import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { marcarSesionExpirada, reiniciarSesionParaPruebas, useSesionExpirada } from './sesion';

afterEach(() => reiniciarSesionParaPruebas());

describe('señal de sesión expirada', () => {
  it('arranca en falso y se enciende al marcarla', () => {
    const { result } = renderHook(() => useSesionExpirada());
    expect(result.current).toBe(false);
    act(() => marcarSesionExpirada());
    expect(result.current).toBe(true);
  });

  it('avisa a todos los suscriptores, no sólo al primero', () => {
    const uno = renderHook(() => useSesionExpirada());
    const dos = renderHook(() => useSesionExpirada());
    act(() => marcarSesionExpirada());
    expect(uno.result.current).toBe(true);
    expect(dos.result.current).toBe(true);
  });

  it('es idempotente: varias respuestas 401 a la vez no reabren nada', () => {
    const { result } = renderHook(() => useSesionExpirada());
    act(() => {
      marcarSesionExpirada();
      marcarSesionExpirada();
      marcarSesionExpirada();
    });
    expect(result.current).toBe(true);
  });

  it('un componente montado después de la expiración la ve de inmediato', () => {
    marcarSesionExpirada();
    const { result } = renderHook(() => useSesionExpirada());
    expect(result.current).toBe(true);
  });
});
