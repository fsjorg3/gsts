import { describe, expect, it } from 'vitest';
import { listarTramitesSchema } from '@gsts/contracts';

describe('listarTramitesSchema', () => {
  it('aplica los valores por defecto de paginación sin filtros', () => {
    const filtros = listarTramitesSchema.parse({});
    expect(filtros.take).toBe(25);
    expect(filtros.cursor).toBeUndefined();
    expect(filtros.estado).toBeUndefined();
  });

  it('acepta todos los filtros opcionales juntos', () => {
    const filtros = listarTramitesSchema.parse({
      estado: 'APROBADO',
      tipoConstancia: 'NO_REGISTRO',
      nis: '12345',
      desde: '2026-01-01T00:00:00.000Z',
      hasta: '2026-12-31T23:59:59.000Z',
      take: '10',
    });
    expect(filtros.estado).toBe('APROBADO');
    expect(filtros.tipoConstancia).toBe('NO_REGISTRO');
    expect(filtros.nis).toBe('12345');
    expect(filtros.take).toBe(10);
  });

  it('rechaza estado/tipoConstancia que no son valores válidos del enum', () => {
    expect(() => listarTramitesSchema.parse({ estado: 'NO_EXISTE' })).toThrow();
    expect(() => listarTramitesSchema.parse({ tipoConstancia: 'OTRO' })).toThrow();
  });

  it('rechaza desde/hasta que no son fecha ISO', () => {
    expect(() => listarTramitesSchema.parse({ desde: '2026-01-01' })).toThrow();
  });
});
