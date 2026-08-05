import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generarPdfConstancia } from '../../src/modules/constancias/plantillas/generar.js';
import { formatearDomicilio, formatearFechaLarga, formatearNumeroOficio } from '../../src/modules/constancias/plantillas/formato.js';
import { parrafosNoRegistro, renderNoRegistro } from '../../src/modules/constancias/plantillas/no-registro.js';
import { PLANTILLAS } from '../../src/modules/constancias/plantillas/tipos.js';
import type { DatosSinQr } from '../../src/modules/constancias/plantillas/generar.js';

const TEXTO_AUTORITATIVO = fileURLToPath(new URL('../../../documentacion/constancia_no-registro.txt', import.meta.url));

const DATOS: DatosSinQr = {
  folioUnico: 'SICEF-42-A1B2C3D4',
  emitidaAt: new Date('2026-07-24T18:00:00.000Z'),
  vigenciaFin: new Date('2026-08-23T18:00:00.000Z'),
  vigenciaDias: 30,
  titular: { nombreRazonSocial: 'JUAN PÉREZ LÓPEZ' },
  nis: null,
  domicilio: { calle: 'CALLE 12 NORTE', numero: '612', colonia: 'COLONIA CENTRO', perteneceA: 'JUNTA_AUXILIAR', perteneceANombre: 'SAN BALTAZAR CAMPECHE' },
  firmante: { nombre: 'Dattoli Mora Miguel Ángel', cargo: 'Gerencia de Supervisión Técnica de los Servicios' },
  oficioPrefijo: 'SOAPAP/GSTS/CNR',
  urlVerificacion: 'https://portal.test/constancias/SICEF-42-A1B2C3D4/verificar/v1.abcdef0123456789abcd',
};

/** Normaliza espacios para comparar texto extraído de un PDF (que reflowea líneas). */
const normalizar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

/**
 * Párrafos del archivo autoritativo, con los placeholders resueltos igual que
 * la plantilla. Si alguien reformula el texto legal en el .txt o en la
 * plantilla sin tocar el otro, esta prueba lo detecta.
 */
function parrafosEsperados(): string[] {
  const crudo = readFileSync(TEXTO_AUTORITATIVO, 'utf8');
  const cuerpo = crudo.split("'''cuerpo")[1]?.split("'''")[0] ?? '';
  return cuerpo
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map((linea) => linea.replace('[Domicilio]', formatearDomicilio(DATOS.domicilio!)));
}

describe('plantilla de constancia de No Registro', () => {
  it('reproduce el texto legal autoritativo palabra por palabra', () => {
    const generados = parrafosNoRegistro({ ...DATOS, qrPng: Buffer.alloc(0) }).map(normalizar);
    const esperados = parrafosEsperados().map(normalizar);

    expect(generados).toHaveLength(esperados.length);
    for (const [indice, esperado] of esperados.entries()) {
      expect(generados[indice]).toBe(esperado);
    }
  });

  it('interpola la vigencia configurada sin tocar el plazo de aviso de 30 días', () => {
    const parrafos = parrafosNoRegistro({ ...DATOS, vigenciaDias: 45, qrPng: Buffer.alloc(0) });
    // Quinto párrafo: vigencia del documento (configurable).
    expect(parrafos[4]).toContain('vigencia de 45 días naturales');
    // Tercer párrafo: plazo legal para dar aviso de cambios (fijo, no es la
    // vigencia). Ojo: sí menciona "45", pero como número de artículo citado.
    expect(parrafos[2]).toContain('los primeros 30 días naturales');
    expect(parrafos[2]).not.toContain('45 días naturales');
  });

  it('no registra plantilla para NO_ADEUDO mientras no exista su texto legal', () => {
    expect(PLANTILLAS['NO_REGISTRO']).toBeDefined();
    expect(PLANTILLAS['NO_ADEUDO']).toBeUndefined();
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
    // 00:30 UTC del 1 de enero sigue siendo 31 de diciembre en Puebla.
    expect(formatearNumeroOficio('SOAPAP/GSTS/CNR', new Date('2027-01-01T00:30:00.000Z'))).toBe('SOAPAP/GSTS/CNR/2026');
  });
});

describe('generación del PDF', () => {
  it('produce un PDF cuyo texto extraído contiene el folio, la fecha y el cuerpo legal', async () => {
    const pdf = await generarPdfConstancia(renderNoRegistro, DATOS);
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    const carpeta = mkdtempSync(join(tmpdir(), 'sicef-pdf-'));
    try {
      const ruta = join(carpeta, 'constancia.pdf');
      writeFileSync(ruta, pdf);
      // -enc UTF-8 es obligatorio: por defecto pdftotext escribe en Latin-1 y
      // los acentos del texto legal llegarían corruptos a la comparación.
      execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', ruta, join(carpeta, 'salida.txt')]);
      const extraido = normalizar(readFileSync(join(carpeta, 'salida.txt'), 'utf8'));

      expect(extraido).toContain(DATOS.folioUnico);
      expect(extraido).toContain('24 de julio de 2026');
      expect(extraido).toContain('Número de Oficio: SOAPAP/GSTS/CNR/2026');
      expect(extraido).toContain('CONSTANCIA DE PREDIO NO REGISTRADO');
      expect(extraido).toContain(DATOS.firmante.nombre);
      expect(extraido).toContain(DATOS.firmante.cargo);
      for (const parrafo of parrafosEsperados()) {
        expect(extraido).toContain(normalizar(parrafo));
      }
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
