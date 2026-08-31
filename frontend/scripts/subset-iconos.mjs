// Genera el subconjunto de Material Symbols Rounded que la app embebe.
//
// La fuente completa pesa 4.9 MB (~3 700 iconos) y usamos ~55. Subsetear por
// ligaduras no funciona: los nombres de icono son letras a–z, así que el cierre
// de ligaduras de harfbuzz retendría prácticamente toda la fuente. En su lugar
// resolvemos el codepoint PUA de cada icono (fontkit ejecuta el shaping y nos
// da el glifo de la ligadura; el cmap inverso da su codepoint) y subseteamos
// por codepoints, donde no hay ligaduras de por medio.
//
// Produce dos artefactos versionados, para que ni el build ni CI dependan de
// este script:
//   - src/assets/material-symbols-rounded-subset.woff2
//   - src/shared/components/iconos.codepoints.ts
//
// Uso: npm run gen:iconos   (tras editar ICONOS en iconos.ts)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';
import { ICONOS } from '../src/shared/components/iconos.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const FUENTE = join(raiz, '..', 'node_modules', 'material-symbols', 'material-symbols-rounded.woff2');
const SALIDA_FUENTE = join(raiz, 'src', 'assets', 'material-symbols-rounded-subset.woff2');
const SALIDA_MAPA = join(raiz, 'src', 'shared', 'components', 'iconos.codepoints.ts');

// La app dibuja siempre la misma instancia (ver MsIcon), así que fijamos los
// ejes variables en sus valores por defecto: el subconjunto deja de ser una
// fuente variable y pesa bastante menos.
const EJES = { FILL: 0, GRAD: 0, opsz: 24, wght: 400 };

const font = fontkit.openSync(FUENTE);

// cmap inverso: glifo → codepoint. Un glifo puede tener varios codepoints
// (alias); nos quedamos con el primero, que es el canónico del icono.
const codepointPorGlifo = new Map();
for (const cp of font.characterSet) {
  const glifo = font.glyphForCodePoint(cp);
  if (glifo && !codepointPorGlifo.has(glifo.id)) codepointPorGlifo.set(glifo.id, cp);
}

const codepoints = new Map();
const sinResolver = [];
for (const nombre of ICONOS) {
  const glifos = font.layout(nombre).glyphs;
  // Si el nombre no forma una ligadura, el shaping devuelve una letra por
  // glifo: es un icono inexistente o mal escrito.
  const cp = glifos.length === 1 ? codepointPorGlifo.get(glifos[0].id) : undefined;
  if (cp === undefined) sinResolver.push(nombre);
  else codepoints.set(nombre, cp);
}

if (sinResolver.length > 0) {
  console.error(`No existen en Material Symbols Rounded: ${sinResolver.join(', ')}`);
  process.exit(1);
}

const texto = [...codepoints.values()].map((cp) => String.fromCodePoint(cp)).join('');
const subconjunto = await subsetFont(readFileSync(FUENTE), texto, {
  targetFormat: 'woff2',
  variationAxes: EJES,
});

mkdirSync(dirname(SALIDA_FUENTE), { recursive: true });
writeFileSync(SALIDA_FUENTE, subconjunto);

const filas = [...codepoints.entries()]
  .map(([nombre, cp]) => `  ${nombre}: '\\u{${cp.toString(16).toUpperCase()}}',`)
  .join('\n');

writeFileSync(
  SALIDA_MAPA,
  `// GENERADO por scripts/subset-iconos.mjs — no editar a mano.
// Codepoint de cada icono de ICONOS (iconos.ts) dentro del subconjunto
// embebido de Material Symbols Rounded. Regenerar con: npm run gen:iconos
import type { IconoNombre } from './iconos';

export const CODEPOINTS: Record<IconoNombre, string> = {
${filas}
};
`,
  'utf8',
);

const antes = readFileSync(FUENTE).byteLength;
console.log(
  `${codepoints.size} iconos · ${(antes / 1024).toFixed(0)} kB → ${(subconjunto.byteLength / 1024).toFixed(1)} kB ` +
    `(${(100 - (subconjunto.byteLength / antes) * 100).toFixed(1)} % menos)`,
);
