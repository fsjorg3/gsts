import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('regresa el valor inicial de inmediato, sin esperar el delay', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('no propaga el nuevo valor antes de que pase el delay', () => {
    const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
      initialProps: { valor: 'a' },
    });
    rerender({ valor: 'ab' });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
  });

  it('propaga el valor una vez transcurrido el delay completo', () => {
    const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
      initialProps: { valor: 'a' },
    });
    rerender({ valor: 'ab' });
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe('ab');
  });

  it('reinicia el temporizador con cada cambio: solo llega el último valor', () => {
    const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
      initialProps: { valor: 'a' },
    });
    rerender({ valor: 'ab' });
    act(() => void vi.advanceTimersByTime(200));
    rerender({ valor: 'abc' });
    act(() => void vi.advanceTimersByTime(200));
    // Han pasado 400ms desde el primer cambio, pero solo 200ms desde el último:
    // el valor intermedio "ab" nunca debió propagarse.
    expect(result.current).toBe('a');
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe('abc');
  });
});
