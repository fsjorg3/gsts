// Normalización de los archivos que se envían a GAF como `comprobantes`.
//
// GAF corre dos filtros independientes sobre cada archivo, y el segundo sólo se
// alcanza si el primero pasa (file-validator.ts de GAF):
//   1. El Content-Type de la parte del multipart debe ser IDÉNTICO al MIME que
//      GAF detecta de los bytes reales. Sin tolerancia: ni `image/jpg`, ni vacío
//      — y si el File no lleva `type`, el navegador omite el header y el parser
//      de GAF lo asume `text/plain`, con lo que falla aquí.
//   2. La extensión del nombre debe corresponder a ese MIME.
//
// Por eso el MIME se deriva de los bytes, no del metadato: así ambos filtros
// quedan garantizados por construcción y no pueden contradecirse entre sí. Las
// firmas son las mismas tres del backend (modules/constancias/cobros/mime-real.ts);
// se repiten aquí porque son entornos distintos (Buffer de Node vs Blob del
// navegador) y porque ésta es una regla de GAF, no del contrato de GSTS.

interface FirmaArchivo {
  mime: 'application/pdf' | 'image/jpeg' | 'image/png';
  extension: '.pdf' | '.jpg' | '.png';
  bytes: number[];
}

const FIRMAS: FirmaArchivo[] = [
  { mime: 'application/pdf', extension: '.pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/jpeg', extension: '.jpg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', extension: '.png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

// Extensiones que se reemplazan por la canónica del contenido. `.jpeg` se
// reconoce para poder quitarla, aunque la que se escribe siempre sea `.jpg`
// (GAF acepta ambas).
const EXTENSIONES_CONOCIDAS = ['.pdf', '.jpg', '.jpeg', '.png'];

const NOMBRE_MAX = 255; // límite que impone GAF, espejo de su columna en base
export const ARCHIVO_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB por archivo en GAF
export const TOTAL_MAX_BYTES = 20 * 1024 * 1024; // 20 MiB acumulados en GAF

/** El archivo no es de un tipo que GAF acepte; se detiene antes de enviarlo. */
export class ComprobanteInvalidoError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ComprobanteInvalidoError';
  }
}

/**
 * Arma el nombre con el que viaja el archivo: sin rutas ni caracteres de
 * control, no vacío, dentro del límite de longitud, y siempre terminado en la
 * extensión canónica del contenido — aunque el nombre original no trajera
 * extensión o trajera una que miente sobre lo que hay dentro.
 */
export function nombreConExtension(nombreSugerido: string, extension: string): string {
  // GAF (busboy) aplica basename() al filename: si dejáramos separadores, el
  // nombre cambiaría del lado del servidor y podría quedar vacío.
  const ultimoSegmento = nombreSugerido.split(/[/\\]/).pop() ?? '';
  const sinControles = [...ultimoSegmento]
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo > 31 && codigo !== 127;
    })
    .join('')
    .trim();

  const enMinusculas = sinControles.toLowerCase();
  const conocida = EXTENSIONES_CONOCIDAS.find((ext) => enMinusculas.endsWith(ext));
  const base = (conocida ? sinControles.slice(0, sinControles.length - conocida.length) : sinControles).trim();

  return `${(base || 'comprobante').slice(0, NOMBRE_MAX - extension.length)}${extension}`;
}

// Se lee con FileReader y no con Blob.arrayBuffer() por el mismo motivo que
// archivoABase64 en features/evidencias: es lo que soporta el entorno de prueba
// (jsdom no implementa arrayBuffer sobre Blob).
function leerCabecera(origen: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.onload = () => resolve(new Uint8Array(lector.result as ArrayBuffer));
    lector.readAsArrayBuffer(origen.slice(0, 8));
  });
}

/**
 * Reconstruye un archivo listo para GAF a partir de sus bytes: detecta el tipo
 * real, le pone la extensión que le corresponde y fija el MIME explícitamente.
 */
export async function normalizarComprobante(origen: Blob, nombreSugerido: string): Promise<File> {
  const cabecera = await leerCabecera(origen);
  const firma = FIRMAS.find((candidata) => candidata.bytes.every((byte, indice) => cabecera[indice] === byte));
  if (!firma) {
    throw new ComprobanteInvalidoError('El archivo no es un PDF, JPG ni PNG válido. Adjunta uno de esos formatos.');
  }
  if (origen.size > ARCHIVO_MAX_BYTES) {
    throw new ComprobanteInvalidoError('El archivo pesa más de 10 MB, el máximo que acepta GAF.');
  }
  return new File([origen], nombreConExtension(nombreSugerido, firma.extension), { type: firma.mime });
}
