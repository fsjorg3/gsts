import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generarPdfConstancia } from '../../src/modules/constancias/plantillas/generar.js';
import { formatearDomicilio, formatearFechaLarga, formatearNumeroOficio } from '../../src/modules/constancias/plantillas/formato.js';
import { parrafosNoAdeudo, renderNoAdeudo, TITULO_NO_ADEUDO } from '../../src/modules/constancias/plantillas/no-adeudo.js';
import { parrafosNoRegistro, renderNoRegistro, TITULO_NO_REGISTRO } from '../../src/modules/constancias/plantillas/no-registro.js';
import { PLANTILLAS } from '../../src/modules/constancias/plantillas/tipos.js';
import type { DatosSinQr } from '../../src/modules/constancias/plantillas/generar.js';
import type { DatosPlantillaConstancia, Parrafo } from '../../src/modules/constancias/plantillas/tipos.js';

const textoAutoritativo = (nombre: string): string =>
  fileURLToPath(new URL(`../../../documentacion/${nombre}`, import.meta.url));

const DATOS: DatosSinQr = {
  folioUnico: 'GSTS-42-A1B2C3D4',
  emitidaAt: new Date('2026-07-24T18:00:00.000Z'),
  vigenciaFin: new Date('2026-08-23T18:00:00.000Z'),
  vigenciaDias: 30,
  titular: { nombreRazonSocial: 'JUAN PÉREZ LÓPEZ' },
  nis: '10203040',
  domicilio: { calle: 'CALLE 12 NORTE', numero: '612', colonia: 'COLONIA CENTRO', perteneceA: 'JUNTA_AUXILIAR', perteneceANombre: 'SAN BALTAZAR CAMPECHE' },
  // El cargo del documento oficial ocupa tres renglones: se usa tal cual para
  // que la prueba ejercite el bloque de firma en su caso más alto.
  firmante: { nombre: 'Dattoli Mora Miguel Ángel', cargo: 'GERENTE DE SUPERVISIÓN TÉCNICA DE LOS SERVICIOS DEL SISTEMA OPERADOR DE AGUA POTABLE Y ALCANTARILLADO DEL MUNICIPIO DE PUEBLA (SOAPAP).' },
  oficioPrefijo: 'SOAPAP/GSTS/CNR',
  urlVerificacion: 'https://portal.test/constancias/GSTS-42-A1B2C3D4/verificar/v1.abcdef0123456789abcd',
};

const CON_QR: DatosPlantillaConstancia = { ...DATOS, qrPng: Buffer.alloc(0) };

/** Normaliza espacios para comparar texto extraído de un PDF (que reflowea líneas). */
const normalizar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

/**
 * Párrafos del archivo autoritativo, con los placeholders resueltos igual que
 * la plantilla. Si alguien reformula el texto legal en el .txt o en la
 * plantilla sin tocar el otro, esta prueba lo detecta.
 */
function parrafosEsperados(archivo: string): string[] {
  const crudo = readFileSync(textoAutoritativo(archivo), 'utf8');
  const cuerpo = crudo.split("'''cuerpo")[1]?.split("'''")[0] ?? '';
  const huecos: Record<string, string> = {
    '[Domicilio]': formatearDomicilio(DATOS.domicilio!),
    '[Vigencia]': String(DATOS.vigenciaDias),
    '[Titular]': DATOS.titular.nombreRazonSocial,
    '[NIS]': DATOS.nis!,
  };
  return cuerpo
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map((linea) => Object.entries(huecos).reduce((texto, [hueco, valor]) => texto.replaceAll(hueco, valor), linea));
}

const PLANTILLAS_PROBADAS = [
  { nombre: 'No Registro', archivo: 'constancia_no-registro.txt', parrafos: parrafosNoRegistro, titulo: TITULO_NO_REGISTRO, render: renderNoRegistro },
  { nombre: 'No Adeudo', archivo: 'constancia_no-adeudo.txt', parrafos: parrafosNoAdeudo, titulo: TITULO_NO_ADEUDO, render: renderNoAdeudo },
] as const;

describe.each(PLANTILLAS_PROBADAS)('plantilla de constancia de $nombre', ({ archivo, parrafos, titulo, render }) => {
  it('reproduce el texto legal autoritativo palabra por palabra', () => {
    const generados = parrafos(CON_QR).map((parrafo: Parrafo) => normalizar(parrafo.texto));
    const esperados = parrafosEsperados(archivo).map(normalizar);

    expect(generados).toHaveLength(esperados.length);
    for (const [indice, esperado] of esperados.entries()) {
      expect(generados[indice]).toBe(esperado);
    }
  });

  it('interpola la vigencia configurada', () => {
    const cuerpo = parrafos({ ...CON_QR, vigenciaDias: 45 }).map((parrafo) => parrafo.texto);
    expect(cuerpo.filter((texto) => texto.includes('vigencia de 45 días'))).toHaveLength(1);
    expect(cuerpo.some((texto) => texto.includes('vigencia de 30 días'))).toBe(false);
  });

  it('produce un PDF con el membrete, la identificación y el cierre del formato oficial', async () => {
    const pdf = await generarPdfConstancia(render, DATOS);
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    const carpeta = mkdtempSync(join(tmpdir(), 'sicef-pdf-'));
    try {
      const ruta = join(carpeta, 'constancia.pdf');
      writeFileSync(ruta, pdf);
      // -enc UTF-8 es obligatorio: por defecto pdftotext escribe en Latin-1 y
      // los acentos del texto legal llegarían corruptos a la comparación.
      execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', ruta, join(carpeta, 'salida.txt')]);
      const extraido = normalizar(readFileSync(join(carpeta, 'salida.txt'), 'utf8'));

      expect(extraido).toContain(`H. Puebla de Zaragoza; a ${formatearFechaLarga(DATOS.emitidaAt)}`);
      expect(extraido).toContain('Número de Oficio: SOAPAP/GSTS/CNR/2026');
      expect(extraido).toContain(`FOLIO: ${DATOS.folioUnico}`);
      expect(extraido).toContain(titulo.toUpperCase());
      expect(extraido).toContain('ATENTAMENTE');
      expect(extraido).toContain(DATOS.firmante.nombre);
      expect(extraido).toContain(DATOS.firmante.cargo);
      expect(extraido).toContain('C.c.p. Archivo.');
      // Una sola página: el formato oficial cabe en una y el pie sólo se dibuja
      // en la actual, así que un desbordamiento pasaría inadvertido.
      expect(readFileSync(join(carpeta, 'salida.txt'), 'utf8').split('\f').filter((pagina) => pagina.trim()).length).toBe(1);
      expect(extraido).toContain('www.soapap.gob.mx');
      // El cargo ocupa el ancho completo; si subiera por encima del QR se
      // encimaría con él. El orden vertical del texto extraído lo delata.
      expect(extraido.indexOf('Verifica esta constancia')).toBeLessThan(extraido.indexOf(DATOS.firmante.cargo));
      expect(extraido.indexOf(DATOS.firmante.cargo)).toBeLessThan(extraido.indexOf('C.c.p. Archivo.'));
      for (const parrafo of parrafosEsperados(archivo)) {
        expect(extraido).toContain(normalizar(parrafo));
      }
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});

describe('registro de plantillas', () => {
  it('cubre los dos tipos de constancia', () => {
    expect(PLANTILLAS['NO_REGISTRO']).toBeDefined();
    expect(PLANTILLAS['NO_ADEUDO']).toBeDefined();
  });
});

describe('texto legal de No Registro', () => {
  it('separa el plazo de aviso de la vigencia del documento', () => {
    const cuerpo = parrafosNoRegistro({ ...CON_QR, vigenciaDias: 45 }).map((parrafo) => parrafo.texto);
    // Tercer párrafo: plazo legal para dar aviso de cambios, fijo.
    expect(cuerpo[2]).toContain('los primeros 30 días naturales');
    expect(cuerpo[2]).not.toContain('45 días');
  });

  it('cita el 128 para las infracciones y el 130 para la sanción', () => {
    // Regresión: la transcripción anterior repetía el 128 en ambas posiciones.
    const parrafo = parrafosNoRegistro(CON_QR)[2]!.texto;
    expect(parrafo).toContain('infracciones previstas en el artículo 128, fracciones VI, VII, XXXV y XLI');
    expect(parrafo).toContain('conforme a lo dispuesto del artículo 130 de dicho ordenamiento');
  });

  it('no repite la cláusula de los artículos 43, 44, 45 y 48', () => {
    // Regresión: la transcripción anterior la duplicaba por copiar y pegar.
    const parrafo = parrafosNoRegistro(CON_QR)[2]!.texto;
    expect(parrafo.match(/43, 44, 45 y 48/g)).toHaveLength(1);
    expect(parrafo).toContain('del servicio que se trate');
  });

  it('resalta el párrafo de no exención como en el formato oficial', () => {
    expect(parrafosNoRegistro(CON_QR)[3]?.enfasis).toBe('negritas-subrayado');
  });
});

describe('texto legal de No Adeudo', () => {
  it('nombra al titular, su NIS y el domicilio del predio', () => {
    const parrafo = parrafosNoAdeudo(CON_QR)[0]!.texto;
    expect(parrafo).toContain('titular de pago JUAN PÉREZ LÓPEZ');
    expect(parrafo).toContain('número de suministro 10203040');
    expect(parrafo).toContain(formatearDomicilio(DATOS.domicilio!));
  });

  it('nombra a la concesionaria con su razón social', () => {
    expect(parrafosNoAdeudo(CON_QR)[0]?.texto).toContain('“CONCESIONES INTEGRALES S.A. DE C.V.”');
  });

  it('resalta el párrafo de vigencia como en el formato oficial', () => {
    expect(parrafosNoAdeudo(CON_QR)[3]?.enfasis).toBe('negritas');
  });
});

describe('formato de la constancia', () => {
  it('formatea la fecha larga en español y en la zona horaria de Puebla', () => {
    expect(formatearFechaLarga(new Date('2026-07-24T18:00:00.000Z'))).toBe('24 de julio de 2026');
    // 00:30 UTC del día 25 sigue siendo 24 en Puebla: formatear en UTC correría el día.
    expect(formatearFechaLarga(new Date('2026-07-25T00:30:00.000Z'))).toBe('24 de julio de 2026');
  });

  it('arma el domicilio con junta auxiliar o municipio y siempre cierra en PUEBLA', () => {
    expect(formatearDomicilio(DATOS.domicilio!)).toBe('CALLE 12 NORTE 612, COLONIA CENTRO, perteneciente a LA JUNTA AUXILIAR SAN BALTAZAR CAMPECHE, PUEBLA');
    expect(formatearDomicilio({ ...DATOS.domicilio!, perteneceA: 'MUNICIPIO', perteneceANombre: 'AMOZOC' })).toBe('CALLE 12 NORTE 612, COLONIA CENTRO, perteneciente a EL MUNICIPIO AMOZOC, PUEBLA');
  });

  it('tolera un domicilio incompleto sin romper la redacción', () => {
    expect(formatearDomicilio({ calle: null, numero: null, colonia: null, perteneceA: null, perteneceANombre: null })).toBe('PUEBLA');
  });

  it('compone el número de oficio con el prefijo y el año de emisión en la zona horaria de Puebla', () => {
    expect(formatearNumeroOficio('SOAPAP/GSTS/CNR', new Date('2026-07-24T18:00:00.000Z'))).toBe('SOAPAP/GSTS/CNR/2026');
    // El prefijo distingue los dos tipos: CNR no registro, CNA no adeudo.
    expect(formatearNumeroOficio('SOAPAP/GSTS/CNA', new Date('2026-07-24T18:00:00.000Z'))).toBe('SOAPAP/GSTS/CNA/2026');
    // 00:30 UTC del 1 de enero sigue siendo 31 de diciembre en Puebla.
    expect(formatearNumeroOficio('SOAPAP/GSTS/CNR', new Date('2027-01-01T00:30:00.000Z'))).toBe('SOAPAP/GSTS/CNR/2026');
  });
});
