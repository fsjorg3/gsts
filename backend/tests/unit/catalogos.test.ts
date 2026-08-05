import { describe, expect, it } from 'vitest';
import { erroresCatalogo } from '../../src/modules/catalogos/catalogos.router.js';

const grupo = (over: Partial<Parameters<typeof erroresCatalogo>[0]['grupos'][number]> = {}) => ({
  clave: 'IDENTIFICACION', orden: 0, aplicaTipo: null, aplicaPersonalidad: null, aplicaRepresentacion: null,
  opciones: [{ clave: 'INE', orden: 0, documentos: [{ orden: 0 }] }],
  ...over,
});

describe('erroresCatalogo', () => {
  it('acepta un catálogo bien formado', () => {
    expect(erroresCatalogo({ grupos: [grupo()] })).toEqual([]);
  });

  it('exige al menos un grupo', () => {
    expect(erroresCatalogo({ grupos: [] })).toContain('El catálogo requiere al menos un grupo aplicable.');
  });

  it('detecta grupos sin opciones y opciones sin documentos', () => {
    const errores = erroresCatalogo({ grupos: [
      grupo({ clave: 'A', opciones: [] }),
      grupo({ clave: 'B', opciones: [{ clave: 'X', orden: 0, documentos: [] }] }),
    ] });
    expect(errores).toContain('El grupo A requiere al menos una opción.');
    expect(errores).toContain('La opción X requiere al menos un documento.');
  });

  it('detecta orden duplicado entre grupos', () => {
    const errores = erroresCatalogo({ grupos: [grupo({ clave: 'A', orden: 1 }), grupo({ clave: 'B', orden: 1 })] });
    expect(errores).toContain('Los grupos tienen valores de orden duplicados.');
  });

  it('detecta documentos con orden duplicado en una opción', () => {
    const errores = erroresCatalogo({ grupos: [grupo({ opciones: [{ clave: 'INE', orden: 0, documentos: [{ orden: 0 }, { orden: 0 }] }] })] });
    expect(errores).toContain('La opción INE tiene documentos con orden duplicado.');
  });

  it('señala combinaciones sin ruta de cumplimiento', () => {
    // Grupo aplicable sólo a NO_ADEUDO/MORAL pero sin documentos: rompe esa combinación.
    const errores = erroresCatalogo({ grupos: [
      grupo(),
      grupo({ clave: 'PM', aplicaTipo: 'NO_ADEUDO', aplicaPersonalidad: 'MORAL', opciones: [{ clave: 'ACTA', orden: 0, documentos: [] }] }),
    ] });
    expect(errores.some((mensaje) => mensaje.includes('NO_ADEUDO/MORAL') && mensaje.includes('PM'))).toBe(true);
  });
});
