import { formatearFechaLarga, formatearNumeroOficio } from './formato.js';
import { dibujarEncabezado, dibujarPie, FIRMA_AUTOGRAFA, MARGENES } from './membrete.js';
import type { DatosPlantillaConstancia, Parrafo } from './tipos.js';

// Maquetación común a las dos constancias. Los documentos oficiales sólo
// difieren en el título y en el cuerpo; todo lo demás —identificación, firma,
// QR y el "C.c.p."— es idéntico, así que vive aquí una sola vez.
//
// Las coordenadas salen de la plantilla oficial (documentacion/plantilla.docx)
// y del documento emitido (documentacion/FORMATO CONSTANCIA.pdf).

/** Alto reservado al QR de verificación, que va a la izquierda del bloque de firma. */
const QR = 92;

/**
 * Renderiza una constancia completa a partir de su título y sus párrafos.
 *
 * `parrafos` llega ya resuelto —sin placeholders— desde la plantilla del tipo,
 * que es una función pura y por eso puede compararse contra el texto
 * autoritativo sin generar un PDF.
 */
export function renderDocumento(
  doc: PDFKit.PDFDocument,
  datos: DatosPlantillaConstancia,
  titulo: string,
  parrafos: readonly Parrafo[],
): void {
  const anchoUtil = doc.page.width - MARGENES.left - MARGENES.right;

  dibujarEncabezado(doc);

  // Identificación del documento, alineada a la derecha bajo el membrete. El
  // oficio no es único (todas las constancias del mismo tipo y año lo
  // comparten): quien necesite localizar un trámite usa el folio, por eso se
  // conservan ambos.
  const identY = 112;
  doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
  doc.text(`H. Puebla de Zaragoza; a ${formatearFechaLarga(datos.emitidaAt)}`, MARGENES.left, identY, { width: anchoUtil, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(9.5);
  doc.text(`Número de Oficio: ${formatearNumeroOficio(datos.oficioPrefijo, datos.emitidaAt)}`, MARGENES.left, identY + 14, { width: anchoUtil, align: 'right' });
  doc.text(`FOLIO: ${datos.folioUnico}`, MARGENES.left, identY + 28, { width: anchoUtil, align: 'right' });

  doc.y = identY + 48;
  doc.font('Helvetica-Bold').fontSize(13).text(titulo.toUpperCase(), MARGENES.left, doc.y, { width: anchoUtil, align: 'center' });

  doc.moveDown(1.2);
  for (const parrafo of parrafos) {
    const negritas = parrafo.enfasis === 'negritas' || parrafo.enfasis === 'negritas-subrayado';
    doc.font(negritas ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    doc.text(parrafo.texto, MARGENES.left, doc.y, {
      width: anchoUtil,
      align: 'justify',
      lineGap: 1.2,
      underline: parrafo.enfasis === 'negritas-subrayado',
    });
    doc.moveDown(0.7);
  }

  dibujarFirma(doc, datos, anchoUtil);
  dibujarPie(doc);
}

/**
 * Bloque de cierre: QR a la izquierda y, centrado, ATENTAMENTE → firma
 * autógrafa → nombre y cargo del firmante. El "C.c.p. Archivo." cierra abajo a
 * la izquierda, como en el documento oficial.
 *
 * El alto de la firma se ajusta al espacio que quede sobre el pie. Los dos
 * documentos tienen cuerpos de distinta longitud —No Registro es bastante más
 * largo— y con una altura fija el bloque se encimaba con el domicilio del pie.
 * Se prefiere una firma más pequeña a un documento de dos páginas: el pie sólo
 * se dibuja en la página actual.
 */
function dibujarFirma(doc: PDFKit.PDFDocument, datos: DatosPlantillaConstancia, anchoUtil: number): void {
  doc.moveDown(1);
  const y = doc.y;
  const yTope = doc.page.height - MARGENES.bottom - 52; // regla superior del pie

  // QR de verificación: codifica la URL pública que confirma folio, titular y
  // vigencia. No es una firma electrónica.
  doc.image(datos.qrPng, MARGENES.left, y, { fit: [QR, QR] });
  doc.font('Helvetica').fontSize(7).fillColor('#5A6068');
  doc.text('Verifica esta constancia', MARGENES.left, y + QR + 3, { width: QR, align: 'center' });
  doc.fillColor('#000000');

  doc.font('Helvetica-Bold').fontSize(10.5);
  doc.text('ATENTAMENTE', MARGENES.left, y, { width: anchoUtil, align: 'center' });
  const altoNombre = doc.heightOfString(datos.firmante.nombre, { width: anchoUtil });
  doc.font('Helvetica-Bold').fontSize(9);
  const altoCargo = doc.heightOfString(datos.firmante.cargo, { width: anchoUtil });

  // Lo que sobra entre ATENTAMENTE y el pie, descontando nombre, cargo y C.c.p.
  const holgura = yTope - (y + 16) - altoNombre - altoCargo - 22;
  const altoFirma = Math.max(26, Math.min(84, holgura));

  // La imagen se centra sobre el ancho útil: `fit` sólo acota el tamaño, así
  // que la x es la del borde izquierdo de la caja, no la del centro. A ese
  // ancho no alcanza la columna del QR, así que puede solaparlo en vertical.
  const anchoFirma = 132;
  doc.image(FIRMA_AUTOGRAFA, MARGENES.left + (anchoUtil - anchoFirma) / 2, y + 16, { fit: [anchoFirma, altoFirma] });

  // El cargo sí ocupa el ancho completo, así que el bloque de texto arranca
  // por debajo del QR pase lo que pase: si la firma se encoge por falta de
  // espacio, el cargo se montaría sobre el código.
  doc.font('Helvetica-Bold').fontSize(10.5);
  doc.text(datos.firmante.nombre, MARGENES.left, Math.max(y + 20 + altoFirma, y + QR + 14), { width: anchoUtil, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text(datos.firmante.cargo, MARGENES.left, doc.y + 1, { width: anchoUtil, align: 'center' });

  doc.font('Helvetica').fontSize(8).text('C.c.p. Archivo.', MARGENES.left, doc.y + 6, { width: anchoUtil, align: 'left' });
}
