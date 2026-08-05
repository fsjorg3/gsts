import { describe, expect, it } from 'vitest';
import { actualizarMotivoReduccionSchema, crearMotivoReduccionSchema } from '@sicef/contracts';

describe('crearMotivoReduccionSchema', () => {
  it('acepta un motivo válido y recorta espacios', () => {
    const motivo = crearMotivoReduccionSchema.parse({ clave: 'inapam ', nombre: '  INAPAM / discapacidad  ', porcentaje: 25 });
    expect(motivo.clave).toBe('inapam');
    expect(motivo.nombre).toBe('INAPAM / discapacidad');
    expect(motivo.porcentaje).toBe(25);
  });

  it('rechaza porcentaje fuera de (0, 100]', () => {
    expect(() => crearMotivoReduccionSchema.parse({ clave: 'x', nombre: 'X', porcentaje: 0 })).toThrow();
    expect(() => crearMotivoReduccionSchema.parse({ clave: 'x', nombre: 'X', porcentaje: 101 })).toThrow();
  });

  it('rechaza clave o nombre vacíos', () => {
    expect(() => crearMotivoReduccionSchema.parse({ clave: '  ', nombre: 'X', porcentaje: 10 })).toThrow();
    expect(() => crearMotivoReduccionSchema.parse({ clave: 'x', nombre: '  ', porcentaje: 10 })).toThrow();
  });
});

describe('actualizarMotivoReduccionSchema', () => {
  it('todos los campos son opcionales (edición parcial)', () => {
    expect(actualizarMotivoReduccionSchema.parse({})).toEqual({});
    expect(actualizarMotivoReduccionSchema.parse({ activo: false })).toEqual({ activo: false });
  });

  it('valida porcentaje cuando se envía', () => {
    expect(() => actualizarMotivoReduccionSchema.parse({ porcentaje: 150 })).toThrow();
    expect(actualizarMotivoReduccionSchema.parse({ porcentaje: 50 }).porcentaje).toBe(50);
  });
});
