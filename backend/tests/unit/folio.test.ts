import { describe, expect, it } from 'vitest';
import { whereDeFolio } from '../../src/modules/constancias/tramites/folio.js';

describe('whereDeFolio', () => {
  it('descompone el folio completo, ignorando el año porque el número ya es único', () => {
    expect(whereDeFolio('NA-2026-02038')).toEqual({ tipoConstancia: 'NO_ADEUDO', numeroTramite: 2038 });
  });

  it('acepta el folio en minúsculas y con espacios alrededor', () => {
    expect(whereDeFolio('  na-2026-02038 ')).toEqual({ tipoConstancia: 'NO_ADEUDO', numeroTramite: 2038 });
  });

  it('acepta sólo el número, con o sin ceros a la izquierda', () => {
    expect(whereDeFolio('02038')).toEqual({ numeroTramite: 2038 });
    expect(whereDeFolio('2038')).toEqual({ numeroTramite: 2038 });
  });

  it('lee un número de cuatro dígitos aislado como numeroTramite, no como año', () => {
    expect(whereDeFolio('2026')).toEqual({ numeroTramite: 2026 });
  });

  it('acota el año en UTC sólo cuando no hay número', () => {
    expect(whereDeFolio('NA-2026')).toEqual({
      tipoConstancia: 'NO_ADEUDO',
      createdAt: { gte: new Date('2026-01-01T00:00:00.000Z'), lt: new Date('2027-01-01T00:00:00.000Z') },
    });
  });

  it('con prefijo y un solo número que no tiene forma de año, lo toma como numeroTramite', () => {
    expect(whereDeFolio('NA-02038')).toEqual({ tipoConstancia: 'NO_ADEUDO', numeroTramite: 2038 });
  });

  it('acepta sólo el prefijo', () => {
    expect(whereDeFolio('NR')).toEqual({ tipoConstancia: 'NO_REGISTRO' });
  });

  it('devuelve null ante entradas no reconocibles, para que el router las rechace', () => {
    expect(whereDeFolio('abc')).toBeNull();
    expect(whereDeFolio('')).toBeNull();
    expect(whereDeFolio('-')).toBeNull();
    expect(whereDeFolio('NA-2026-02038-7')).toBeNull();
    expect(whereDeFolio('XX-2026')).toBeNull();
  });
});
