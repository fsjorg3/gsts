import { describe, expect, it } from 'vitest';
import { derivarPaso } from './pages/TramiteWizard';

const base = { constancia: null, cobro: null, plazoPagoHasta: null };

describe('derivarPaso — el paso del stepper es función del estado del servidor', () => {
  it('CAPTURA → paso 0 y EN_VALIDACION → paso 1', () => {
    expect(derivarPaso({ ...base, estado: 'CAPTURA' }, false)).toBe(0);
    expect(derivarPaso({ ...base, estado: 'EN_VALIDACION' }, false)).toBe(1);
  });

  it('APROBADO → paso 2, o paso 3 si la ventanilla entró a la sub-vista de cobro', () => {
    expect(derivarPaso({ ...base, estado: 'APROBADO' }, false)).toBe(2);
    expect(derivarPaso({ ...base, estado: 'APROBADO' }, true)).toBe(3);
  });

  it('COBRO → paso 3 sin constancia; paso 4 (entrega) con constancia emitida', () => {
    expect(derivarPaso({ ...base, estado: 'COBRO' }, false)).toBe(3);
    expect(derivarPaso({ ...base, estado: 'COBRO', constancia: { id: 'c' } as never }, false)).toBe(4);
  });

  it('FINALIZADO → paso 4', () => {
    expect(derivarPaso({ ...base, estado: 'FINALIZADO' }, false)).toBe(4);
  });

  it('RECHAZADO/EXPIRADO se anclan al último paso lógico alcanzado', () => {
    expect(derivarPaso({ ...base, estado: 'RECHAZADO' }, false)).toBe(1);
    expect(derivarPaso({ ...base, estado: 'RECHAZADO', plazoPagoHasta: '2026-07-01T00:00:00Z' }, false)).toBe(2);
    expect(derivarPaso({ ...base, estado: 'EXPIRADO', plazoPagoHasta: '2026-07-01T00:00:00Z' }, false)).toBe(2);
    expect(derivarPaso({ ...base, estado: 'RECHAZADO', cobro: { id: 'x' } as never, plazoPagoHasta: '2026-07-01T00:00:00Z' }, false)).toBe(3);
  });
});
