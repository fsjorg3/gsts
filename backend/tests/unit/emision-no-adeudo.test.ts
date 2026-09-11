import { describe, expect, it } from 'vitest';
import { motivoFaltanteEmisionNoAdeudo, type DatosEmisionTramite } from '../../src/modules/constancias/constancias/emision-no-adeudo.js';

function tramite(overrides: Partial<DatosEmisionTramite> = {}): DatosEmisionTramite {
  return {
    tipoConstancia: 'NO_ADEUDO',
    nis: '2164542',
    domicilioCalle: 'CALLE PLAZA B M 6',
    domicilioNumero: '4',
    domicilioColonia: 'INFONAVIT SAN JORGE',
    ...overrides,
  };
}

describe('motivoFaltanteEmisionNoAdeudo', () => {
  it('No Registro nunca exige nis ni domicilio (su domicilio es su dato principal, capturado desde el inicio)', () => {
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ tipoConstancia: 'NO_REGISTRO', nis: null, domicilioCalle: null }))).toBeNull();
  });

  it('No Adeudo sin nis: motivo de NIS', () => {
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ nis: null }))).toMatch(/numero de suministro \(NIS\)/);
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ nis: '   ' }))).toMatch(/numero de suministro \(NIS\)/);
  });

  it('No Adeudo con nis pero domicilio incompleto: motivo de domicilio, para cada campo faltante por separado', () => {
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ domicilioCalle: null }))).toMatch(/domicilio del predio/);
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ domicilioNumero: null }))).toMatch(/domicilio del predio/);
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ domicilioColonia: null }))).toMatch(/domicilio del predio/);
    expect(motivoFaltanteEmisionNoAdeudo(tramite({ domicilioCalle: '   ' }))).toMatch(/domicilio del predio/);
  });

  it('No Adeudo con nis y domicilio completo: null', () => {
    expect(motivoFaltanteEmisionNoAdeudo(tramite())).toBeNull();
  });
});
