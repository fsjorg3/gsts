import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as fontkit from 'fontkit';
import { describe, expect, it } from 'vitest';
import { ICONOS } from './iconos';
import { CODEPOINTS } from './iconos.codepoints';

// La fuente embebida es un subconjunto generado (npm run gen:iconos). Que
// ICONOS y CODEPOINTS estén completos ya lo garantiza el tipo `Record<IconoNombre, string>`,
// pero nada en el compilador impide que el .woff2 versionado quede rezagado
// respecto de la lista: eso sólo se ve abriendo la fuente.
// jsdom sirve import.meta.url como http://, no file://: la ruta se ancla al
// directorio del workspace, desde donde corre vitest.
const RUTA_FUENTE = join(process.cwd(), 'src/assets/material-symbols-rounded-subset.woff2');

describe('subconjunto de Material Symbols', () => {
  // openSync devuelve Font | FontCollection; un .woff2 suelto siempre es Font.
  const abierta = fontkit.openSync(RUTA_FUENTE);
  if ('fonts' in abierta) throw new Error('El subconjunto no debería ser una colección de fuentes');
  const fuente = abierta;

  it('dibuja todos los iconos declarados en ICONOS', () => {
    const faltantes = ICONOS.filter((nombre) => {
      const codepoint = CODEPOINTS[nombre].codePointAt(0);
      if (codepoint === undefined) return true;
      const glifo = fuente.glyphForCodePoint(codepoint);
      // id 0 es .notdef; un glifo sin contornos sería un cuadro vacío en pantalla.
      return !glifo || glifo.id === 0 || glifo.path.commands.length === 0;
    });
    expect(faltantes, 'faltan en el .woff2: corre `npm run gen:iconos`').toEqual([]);
  });

  it('no arrastra la fuente completa: el subconjunto pesa unos pocos kB', () => {
    // La fuente original son ~4.9 MB con ~3 700 iconos. Este techo detecta que
    // alguien haya vuelto a versionar la fuente sin subsetear.
    expect(readFileSync(RUTA_FUENTE).byteLength).toBeLessThan(100 * 1024);
  });

  it('cada icono tiene un codepoint distinto', () => {
    expect(new Set(Object.values(CODEPOINTS)).size).toBe(ICONOS.length);
  });
});
