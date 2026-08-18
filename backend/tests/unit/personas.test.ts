import { describe, expect, it } from 'vitest';
import { buscarPersonasSchema, crearPersonaSchema } from '@gsts/contracts';

describe('crearPersonaSchema', () => {
  it('acepta persona física con RFC de 13 y recorta espacios', () => {
    const persona = crearPersonaSchema.parse({ tipo: 'FISICA', nombreRazonSocial: '  Juan Pérez Salinas  ', rfc: 'PESJ790101HT4' });
    expect(persona.nombreRazonSocial).toBe('Juan Pérez Salinas');
    expect(persona.rfc).toBe('PESJ790101HT4');
  });

  it('acepta persona moral sin RFC (opcional en captura)', () => {
    const persona = crearPersonaSchema.parse({ tipo: 'MORAL', nombreRazonSocial: 'Constructora Angelópolis SA de CV' });
    expect(persona.rfc).toBeUndefined();
  });

  it('rechaza RFC fuera del rango 12-13 caracteres', () => {
    expect(() => crearPersonaSchema.parse({ tipo: 'FISICA', nombreRazonSocial: 'X', rfc: 'CORTO' })).toThrow();
    expect(() => crearPersonaSchema.parse({ tipo: 'FISICA', nombreRazonSocial: 'X', rfc: 'DEMASIADOLARGO1' })).toThrow();
  });

  it('rechaza nombre vacío y tipo desconocido', () => {
    expect(() => crearPersonaSchema.parse({ tipo: 'FISICA', nombreRazonSocial: '   ' })).toThrow();
    expect(() => crearPersonaSchema.parse({ tipo: 'OTRO', nombreRazonSocial: 'X' })).toThrow();
  });
});

describe('buscarPersonasSchema', () => {
  it('aplica defaults de paginación y search opcional', () => {
    const query = buscarPersonasSchema.parse({});
    expect(query.take).toBe(25);
    expect(query.cursor).toBeUndefined();
    expect(query.search).toBeUndefined();
  });

  it('coacciona take desde query string y respeta el máximo', () => {
    expect(buscarPersonasSchema.parse({ take: '50' }).take).toBe(50);
    expect(() => buscarPersonasSchema.parse({ take: '101' })).toThrow();
  });

  it('recorta el término de búsqueda y rechaza el vacío', () => {
    expect(buscarPersonasSchema.parse({ search: '  Pérez  ' }).search).toBe('Pérez');
    expect(() => buscarPersonasSchema.parse({ search: '   ' })).toThrow();
  });
});
