import { describe, expect, it } from 'vitest';
import { guardarConfiguracionConstanciaSchema } from '@gsts/contracts';
import { sumarDias } from '../../src/modules/constancias/constancias/constancias.router.js';

describe('guardarConfiguracionConstanciaSchema', () => {
  it('acepta una configuración completa', () => {
    const configuracion = guardarConfiguracionConstanciaSchema.parse({
      vigenciaDias: 30,
      firmanteNombre: 'Dattoli Mora Miguel Ángel',
      firmanteCargo: 'Gerencia de Supervisión Técnica de los Servicios',
    });
    expect(configuracion.vigenciaDias).toBe(30);
  });

  it('no inventa una vigencia por defecto: el campo es obligatorio', () => {
    expect(() => guardarConfiguracionConstanciaSchema.parse({ firmanteNombre: 'X', firmanteCargo: 'Y' })).toThrow();
  });

  it('rechaza vigencias no positivas o fraccionarias', () => {
    const base = { firmanteNombre: 'X', firmanteCargo: 'Y' };
    expect(() => guardarConfiguracionConstanciaSchema.parse({ ...base, vigenciaDias: 0 })).toThrow();
    expect(() => guardarConfiguracionConstanciaSchema.parse({ ...base, vigenciaDias: -5 })).toThrow();
    expect(() => guardarConfiguracionConstanciaSchema.parse({ ...base, vigenciaDias: 1.5 })).toThrow();
  });

  it('exige nombre y cargo del firmante no vacíos', () => {
    expect(() => guardarConfiguracionConstanciaSchema.parse({ vigenciaDias: 30, firmanteNombre: '   ', firmanteCargo: 'Y' })).toThrow();
    expect(() => guardarConfiguracionConstanciaSchema.parse({ vigenciaDias: 30, firmanteNombre: 'X', firmanteCargo: '' })).toThrow();
  });
});

describe('sumarDias', () => {
  it('suma días naturales', () => {
    expect(sumarDias(new Date('2026-07-24T18:00:00.000Z'), 30).toISOString()).toBe('2026-08-23T18:00:00.000Z');
  });

  it('cruza fin de mes y año sin corrimientos', () => {
    expect(sumarDias(new Date('2026-12-20T12:00:00.000Z'), 30).toISOString()).toBe('2027-01-19T12:00:00.000Z');
  });

  it('no muta la fecha recibida', () => {
    const emitidaAt = new Date('2026-07-24T18:00:00.000Z');
    sumarDias(emitidaAt, 30);
    expect(emitidaAt.toISOString()).toBe('2026-07-24T18:00:00.000Z');
  });
});
