import { describe, expect, it } from 'vitest';
import { crearTramiteSchema, importarPadronSchema } from '@gsts/contracts';

const PERSONAS = [{ personaId: '55555555-5555-5555-5555-555555555555', rol: 'TITULAR' as const }];

describe('crearTramiteSchema — regla de No Adeudo', () => {
  it('rechaza No Adeudo sin nis ni domicilio', () => {
    const resultado = crearTramiteSchema.safeParse({
      tipoConstancia: 'NO_ADEUDO', personalidad: 'FISICA', representacion: 'TITULAR', personas: PERSONAS,
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const rutas = resultado.error.issues.map((issue) => issue.path.join('.'));
      expect(rutas).toEqual(expect.arrayContaining(['nis', 'domicilioCalle', 'domicilioNumero', 'domicilioColonia']));
    }
  });

  it('rechaza No Adeudo con nis pero sin domicilio completo', () => {
    const resultado = crearTramiteSchema.safeParse({
      tipoConstancia: 'NO_ADEUDO', personalidad: 'FISICA', representacion: 'TITULAR', personas: PERSONAS,
      nis: '2164542', domicilioCalle: 'CALLE PLAZA B M 6',
    });
    expect(resultado.success).toBe(false);
  });

  it('acepta No Adeudo con nis y domicilio completo', () => {
    const resultado = crearTramiteSchema.safeParse({
      tipoConstancia: 'NO_ADEUDO', personalidad: 'FISICA', representacion: 'TITULAR', personas: PERSONAS,
      nis: '2164542', domicilioCalle: 'CALLE PLAZA B M 6', domicilioNumero: '4', domicilioColonia: 'INFONAVIT SAN JORGE',
    });
    expect(resultado.success).toBe(true);
  });

  it('no exige nis ni domicilio para No Registro', () => {
    const resultado = crearTramiteSchema.safeParse({
      tipoConstancia: 'NO_REGISTRO', personalidad: 'FISICA', representacion: 'TITULAR', personas: PERSONAS,
    });
    expect(resultado.success).toBe(true);
  });
});

describe('crearTramiteSchema — personas por rol de representación', () => {
  const TITULAR = { personaId: '55555555-5555-5555-5555-555555555555', rol: 'TITULAR' as const };
  const REPRESENTANTE = { personaId: '66666666-6666-6666-6666-666666666666', rol: 'REPRESENTANTE' as const };
  const APODERADO = { personaId: '77777777-7777-7777-7777-777777777777', rol: 'APODERADO' as const };
  const base = { tipoConstancia: 'NO_REGISTRO' as const, personalidad: 'FISICA' as const };

  it('rechaza representación TITULAR con más de una persona', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'TITULAR', personas: [TITULAR, REPRESENTANTE] });
    expect(resultado.success).toBe(false);
  });

  it('acepta representación TITULAR con sólo el titular', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'TITULAR', personas: [TITULAR] });
    expect(resultado.success).toBe(true);
  });

  it('rechaza representación REPRESENTANTE con sólo el titular (falta quien se presenta)', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'REPRESENTANTE', personas: [TITULAR] });
    expect(resultado.success).toBe(false);
  });

  it('rechaza representación REPRESENTANTE sin titular (aunque venga el representante)', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'REPRESENTANTE', personas: [REPRESENTANTE] });
    expect(resultado.success).toBe(false);
  });

  it('rechaza representación REPRESENTANTE si la segunda persona trae el rol equivocado', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'REPRESENTANTE', personas: [TITULAR, APODERADO] });
    expect(resultado.success).toBe(false);
  });

  it('rechaza roles TITULAR duplicados', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'REPRESENTANTE', personas: [TITULAR, TITULAR] });
    expect(resultado.success).toBe(false);
  });

  it('acepta representación REPRESENTANTE con titular + representante', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'REPRESENTANTE', personas: [TITULAR, REPRESENTANTE] });
    expect(resultado.success).toBe(true);
  });

  it('acepta representación APODERADO con titular + apoderado', () => {
    const resultado = crearTramiteSchema.safeParse({ ...base, representacion: 'APODERADO', personas: [TITULAR, APODERADO] });
    expect(resultado.success).toBe(true);
  });
});

describe('importarPadronSchema', () => {
  it('recorta rutaArchivo y rechaza vacío', () => {
    expect(importarPadronSchema.parse({ rutaArchivo: '  /datos/padron/extracto.csv  ' }).rutaArchivo).toBe('/datos/padron/extracto.csv');
    expect(() => importarPadronSchema.parse({ rutaArchivo: '   ' })).toThrow();
    expect(() => importarPadronSchema.parse({})).toThrow();
  });
});
