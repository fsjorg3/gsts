import { describe, expect, it } from 'vitest';
import { formatBytes, formatFecha, formatMxn } from './serializers';

describe('formatMxn', () => {
  it('formatea montos string del backend como pesos mexicanos', () => {
    expect(formatMxn('186')).toBe('$186.00');
    expect(formatMxn('1234.5')).toBe('$1,234.50');
  });
  it('regresa em dash para nulos y vacíos', () => {
    expect(formatMxn(null)).toBe('—');
    expect(formatMxn(undefined)).toBe('—');
    expect(formatMxn('')).toBe('—');
  });
  it('no revienta con basura: regresa el string original', () => {
    expect(formatMxn('no-numérico')).toBe('no-numérico');
  });
});

describe('formatFecha', () => {
  it('usa mes abreviado en minúscula (regla del design system)', () => {
    expect(formatFecha('2026-06-30T12:00:00.000Z')).toMatch(/^\d{1,2} jun 2026$/);
  });
  it('regresa em dash para nulos e inválidos', () => {
    expect(formatFecha(null)).toBe('—');
    expect(formatFecha('fecha-rota')).toBe('—');
  });
});

describe('formatBytes', () => {
  it('escala B → KB → MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(12_582_912)).toBe('12.0 MB');
  });
});
