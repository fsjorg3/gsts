import { describe, expect, it } from 'vitest';
import { listarBitacoraSchema } from '@sicef/contracts';

describe('listarBitacoraSchema', () => {
  it('aplica los valores por defecto de paginación sin filtros', () => {
    const filtros = listarBitacoraSchema.parse({});
    expect(filtros.take).toBe(25);
    expect(filtros.cursor).toBeUndefined();
    expect(filtros.entidad).toBeUndefined();
  });

  it('acepta todos los filtros opcionales juntos', () => {
    const filtros = listarBitacoraSchema.parse({
      entidad: 'tramite',
      entidadId: '11111111-1111-1111-1111-111111111111',
      accion: 'TRANSICION_ESTADO',
      actorId: '22222222-2222-2222-2222-222222222222',
      desde: '2026-01-01T00:00:00.000Z',
      hasta: '2026-12-31T23:59:59.000Z',
      take: '10',
    });
    expect(filtros.entidad).toBe('tramite');
    expect(filtros.take).toBe(10);
  });

  it('rechaza entidadId/actorId que no son UUID', () => {
    expect(() => listarBitacoraSchema.parse({ entidadId: 'no-es-uuid' })).toThrow();
    expect(() => listarBitacoraSchema.parse({ actorId: 'no-es-uuid' })).toThrow();
  });

  it('rechaza desde/hasta que no son fecha ISO', () => {
    expect(() => listarBitacoraSchema.parse({ desde: '2026-01-01' })).toThrow();
  });
});
