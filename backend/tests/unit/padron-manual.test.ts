import { describe, expect, it } from 'vitest';
import { requierePadronOfflineManual, type DatosParaAltaPadronManual } from '../../src/modules/constancias/tramites/padron-manual.js';

function input(overrides: Partial<DatosParaAltaPadronManual> = {}): DatosParaAltaPadronManual {
  return {
    tipoConstancia: 'NO_ADEUDO',
    nis: '2164542',
    domicilioCalle: 'CALLE PLAZA B M 6',
    domicilioNumero: '4',
    domicilioColonia: 'INFONAVIT SAN JORGE',
    ...overrides,
  };
}

describe('requierePadronOfflineManual', () => {
  it('No Registro nunca requiere alta en el catálogo offline', () => {
    expect(requierePadronOfflineManual(input({ tipoConstancia: 'NO_REGISTRO' }))).toBe(false);
  });

  it('No Adeudo sin nis no requiere alta', () => {
    expect(requierePadronOfflineManual(input({ nis: undefined }))).toBe(false);
  });

  it('No Adeudo con nis pero domicilio incompleto no requiere alta, para cada campo faltante por separado', () => {
    expect(requierePadronOfflineManual(input({ domicilioCalle: undefined }))).toBe(false);
    expect(requierePadronOfflineManual(input({ domicilioNumero: undefined }))).toBe(false);
    expect(requierePadronOfflineManual(input({ domicilioColonia: undefined }))).toBe(false);
  });

  it('No Adeudo con nis y domicilio completo sí requiere alta', () => {
    expect(requierePadronOfflineManual(input())).toBe(true);
  });
});
