import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { useFiltrosUrl } from './useFiltrosUrl';

const CLAVES = ['estado', 'nis', 'filas'] as const;

function envoltura(rutaInicial: string) {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>;
}

/** El hook bajo prueba junto a la URL resultante, para verificar ambas caras. */
function montar(rutaInicial = '/ventanilla') {
  return renderHook(() => ({ ...useFiltrosUrl(CLAVES), busqueda: useLocation().search }), {
    wrapper: envoltura(rutaInicial),
  });
}

describe('useFiltrosUrl', () => {
  it('lee de la URL los filtros que ya vienen puestos', () => {
    const { result } = montar('/ventanilla?estado=APROBADO&nis=123&filas=50');
    expect(result.current.filtros).toEqual({ estado: 'APROBADO', nis: '123', filas: '50' });
  });

  it('ignora claves ajenas y valores vacíos', () => {
    const { result } = montar('/ventanilla?estado=&nis=123&otra=x');
    expect(result.current.filtros).toEqual({ nis: '123' });
  });

  it('al aplicar escribe el query y omite lo vacío', () => {
    const { result } = montar();
    act(() => result.current.aplicar({ estado: 'COBRO', nis: '', filas: '25' }));
    expect(result.current.busqueda).toBe('?estado=COBRO&filas=25');
    expect(result.current.filtros).toEqual({ estado: 'COBRO', filas: '25' });
  });

  it('aplicar reemplaza, no acumula: lo que no se manda se va', () => {
    const { result } = montar('/ventanilla?estado=APROBADO&nis=123');
    act(() => result.current.aplicar({ nis: '456' }));
    expect(result.current.filtros).toEqual({ nis: '456' });
  });

  it('limpiar deja la URL sin query', () => {
    const { result } = montar('/ventanilla?estado=APROBADO&filas=100');
    act(() => result.current.limpiar());
    expect(result.current.busqueda).toBe('');
    expect(result.current.filtros).toEqual({});
  });
});
