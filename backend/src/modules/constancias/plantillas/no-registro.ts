import { formatearDomicilio, formatearFechaLarga, formatearNumeroOficio } from './formato.js';
import { dibujarEncabezado, dibujarPie, MARGENES } from './membrete.js';
import type { DatosPlantillaConstancia } from './tipos.js';


import { fileURLToPath } from 'node:url';

// Constancia de predio no registrado.
//
// El texto proviene literalmente de documentacion/constancia_no-registro.txt y
// NO debe parafrasearse ni "corregirse": son citas de artículos específicos y
// su redacción es la aprobada. Lo único variable son los placeholders.
//
// Ojo con los dos plazos de 30 días: el del tercer párrafo es el que tiene el
// interesado para dar aviso de cambios (fijo, parte del texto legal), y el del
// quinto es la vigencia del documento (configurable, se interpola). No son el
// mismo número aunque hoy coincidan.

const logo = (nombre: string): string => fileURLToPath(new URL(`../../../../recursos/firma/${nombre}`, import.meta.url));

export const firma = {
  firma: logo('firma.png'),
} as const;

export const TITULO_NO_REGISTRO = 'Constancia de predio no registrado';

/**
 * Cuerpo de la constancia como párrafos sueltos. Función pura para poder
 * compararla contra el texto autoritativo en una prueba, sin generar un PDF.
 */
export function parrafosNoRegistro(datos: DatosPlantillaConstancia): string[] {
  const domicilio = datos.domicilio ? formatearDomicilio(datos.domicilio) : '';
  return [
    `Con fundamento en lo dispuesto por el articulo 8 de la constitución política de los estados unidos mexicanos, 1,2,4,5 fracción V, 6 y 28 fracción XXIV del reglamento interior del Sistema Operador de los Servicios de Agua Potable y Alcantarillado del Municipio de Puebla, y con respecto al predio ubicado en ${domicilio}; hago de su conocimiento lo siguiente:`,
    'En una minuciosa revisión al sistema para verificar la existencia de registro del citado predio, se observó que no existe registro alguno, dando como consecuencia que no tengo número de cuenta asignado.',
    'El interesado deberá dar aviso durante los primeros 30 días naturales a esta autoridad sobre cualquier cambio realizado al predio, con la finalidad de emitir la facturación correspondiente por los servicios que proporciona este Organismo, los interesados deberán celebrar el contrato respectivo del servicio que se trae, así como cumplir con los requisitos y condiciones que establecen los artículos 43, 44, 45 y 48 de la ley del Agua para el estado de Puebla respectivamente, evitando incurrir en las fracciones previstas en el artículo 43, 44, 45 y 48 de la Ley del Agua para el Estado de Puebla respectivamente, evitando incurrir en las infracciones previstas en el artículo 128, fracciones VI, VII, XXXV y XLI, mismas que serán sancionadas conforme a lo dispuesto del artículo 128 de dicho ordenamiento.',
    'No omito manifestar que la presente Constancia, no exime al interesado de responsabilidad alguna respecto a las obligaciones que pudiera tener con este Sistema Operador, derivado de una visita de inspección o verificación de la que podría ser sujeto el predio en cuestión, a partir de la emisión del presente documento.',
    `Cabe destacar que dicha constancia cuenta con una vigencia de ${datos.vigenciaDias} días naturales a partir de su fecha de expedición.`,
    'Sin otro particular, le reitero la seguridad de mi atenta y distinguida consideración.',
  ];
}

export function renderNoRegistro(doc: PDFKit.PDFDocument, datos: DatosPlantillaConstancia): void {
  const anchoUtil = doc.page.width - MARGENES.left - MARGENES.right;

  dibujarEncabezado(doc);

  // Identificación del documento: fecha, número de oficio y folio, alineados
  // a la derecha bajo el membrete. El oficio no es único (todas las
  // constancias del mismo tipo y año lo comparten): quien necesite localizar
  // un trámite usa el folio, por eso se conservan ambos.
  const identY = 112;
  doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
  doc.text(formatearFechaLarga(datos.emitidaAt), MARGENES.left, identY, { width: anchoUtil, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(9.5);
  doc.text(`Número de Oficio: ${formatearNumeroOficio(datos.oficioPrefijo, datos.emitidaAt)}`, MARGENES.left, identY + 14, { width: anchoUtil, align: 'right' });
  doc.text(`Folio: ${datos.folioUnico}`, MARGENES.left, identY + 28, { width: anchoUtil, align: 'right' });

  doc.y = identY + 48;
  doc.font('Helvetica-Bold').fontSize(13).text(TITULO_NO_REGISTRO.toUpperCase(), MARGENES.left, doc.y, { width: anchoUtil, align: 'center' });

  doc.moveDown(1.4);
  doc.font('Helvetica').fontSize(10.5);
  for (const parrafo of parrafosNoRegistro(datos)) {
    doc.text(parrafo, MARGENES.left, doc.y, { width: anchoUtil, align: 'justify', lineGap: 1.6 });
    doc.moveDown(0.85);
  }

  // Bloque de firma centrado; el QR va a su izquierda, alineado al mismo bloque.
  doc.moveDown(1.2);
  const yFirma = doc.y;

  doc.image(datos.qrPng, MARGENES.left, yFirma, { fit: [92, 92] });
  doc.font('Helvetica').fontSize(7).fillColor('#5A6068');
  doc.text('Verifica esta constancia', MARGENES.left, yFirma + 95, { width: 92, align: 'center' });
  doc.fillColor('#000000');

  doc.image(firma.firma, anchoUtil/2, yFirma, { fit: [120, 120] });

  doc.font('Helvetica').fontSize(10.5).text('Atentamente', MARGENES.left, yFirma + 18, { width: anchoUtil, align: 'center' });
  doc.moveDown(2.6);
  doc.font('Helvetica-Bold').fontSize(10.5).text(datos.firmante.nombre, MARGENES.left, doc.y, { width: anchoUtil, align: 'center' });
  doc.font('Helvetica').fontSize(9.5).text(datos.firmante.cargo, MARGENES.left, doc.y + 2, { width: anchoUtil, align: 'center' });

  dibujarPie(doc);
}
