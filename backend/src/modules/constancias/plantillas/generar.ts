import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { MARGENES } from './membrete.js';
import type { DatosPlantillaConstancia, PlantillaConstancia } from './tipos.js';

/** Datos de la plantilla sin el QR: lo rasteriza este módulo. */
export type DatosSinQr = Omit<DatosPlantillaConstancia, 'qrPng'>;

/**
 * Rasteriza el QR y renderiza el PDF completo en memoria.
 *
 * Devuelve el Buffer en vez de escribir a disco porque el llamador necesita
 * exactamente esos bytes: son los que se guardan en NFS y los que se hashean
 * para verificar la integridad del archivo servido. Nada puede modificarse
 * después de este punto: trg_constancia_inmutable bloquea cualquier UPDATE
 * sobre las columnas de la constancia, incluido el hash.
 */
export async function generarPdfConstancia(plantilla: PlantillaConstancia, datos: DatosSinQr): Promise<Buffer> {
  const qrPng = await QRCode.toBuffer(datos.urlVerificacion, { type: 'png', errorCorrectionLevel: 'M', margin: 1, scale: 8, color: { dark: '#3D0017FF', light: '#FFFFFFFF' } });

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: MARGENES,
      autoFirstPage: true,
      info: { Title: `Constancia ${datos.folioUnico}`, Author: 'SOAPAP' },
    });
    const trozos: Buffer[] = [];
    doc.on('data', (trozo: Buffer) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    try {
      plantilla(doc, { ...datos, qrPng });
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
