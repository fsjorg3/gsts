import { fileURLToPath } from 'node:url';

// Membrete institucional compartido por las plantillas de constancia.
//
// Los logotipos viven en backend/recursos/logotipos/ (fuera de src/, por lo que
// `tsc` no los toca) y se resuelven relativo a este módulo. La ruta funciona
// igual en desarrollo y en producción porque dist/ espeja src/ (rootDir=src,
// outDir=dist), así que este archivo está a la misma profundidad en ambos.
//
// Coordenadas, márgenes y logotipos salen literalmente de la plantilla oficial
// (documentacion/plantilla.docx): se extrajo su XML (pgMar y el offset/extent
// de cada imagen) en vez de adivinar la composición.
const recurso = (ruta: string): string => fileURLToPath(new URL(`../../../../recursos/${ruta}`, import.meta.url));

export const LOGOS = {
  soapap: recurso('logotipos/soapap.png'),
  gobiernoPuebla: recurso('logotipos/gobierno-puebla.png'),
  porAmorAPuebla: recurso('logotipos/por-amor-a-puebla.png'),
  pensarEnGrande: recurso('logotipos/pensar-en-grande.png'),
} as const;

/**
 * Firma autógrafa escaneada del titular de la Gerencia. El formato oficial deja
 * el espacio en blanco para firmar a mano; SICEF la estampa para que la
 * constancia salga de ventanilla lista para entregar. La validez jurídica sigue
 * apoyándose en esta firma y en la verificación pública por QR — no hay PKI.
 */
export const FIRMA_AUTOGRAFA = recurso('firma/firma.png');

/** pgMar de la plantilla oficial: 993/1041/1440/1440 twips ≈ 50/52/72/72 pt. */
export const MARGENES = { top: 72, bottom: 72, left: 50, right: 52 } as const;

/**
 * Encabezado: los tres logotipos institucionales (SOAPAP, Pensar en Grande,
 * Por Amor a Puebla) en una franja centrada en el ancho completo de la
 * página — no relativa a los márgenes, así está posicionado el grupo en la
 * plantilla oficial (positionH relativeFrom="page", align="center").
 *
 * No dibuja fecha/folio/oficio: eso ahora es un bloque de identificación en
 * el cuerpo de cada plantilla (ver no-registro.ts), porque su contenido varía
 * por tipo de constancia.
 */
export function dibujarEncabezado(doc: PDFKit.PDFDocument): void {
  const y = 18;
  const anchoBanda = 476;
  const inicioX = (doc.page.width - anchoBanda) / 2;

  doc.image(LOGOS.soapap, inicioX, y, { fit: [129, 70] });
  doc.image(LOGOS.pensarEnGrande, inicioX + 180, y, { fit: [128, 76] });
  doc.image(LOGOS.porAmorAPuebla, inicioX + 359, y, { fit: [117, 69] });

  doc.moveTo(MARGENES.left, y + 86).lineTo(doc.page.width - MARGENES.right, y + 86).lineWidth(0.8).strokeColor('#5B132B').stroke();
}

/**
 * Pie institucional: domicilio a la izquierda (gris, pequeño) y el logotipo
 * de Gobierno del Estado a la derecha, con una regla fina arriba — la misma
 * composición y el mismo texto (verbatim, incluida la falta de acento en
 * "Rio") que trae la plantilla oficial. Se dibuja en posición absoluta al
 * final de la página, sin alterar el cursor de texto del cuerpo.
 */
export function dibujarPie(doc: PDFKit.PDFDocument): void {
  const y = doc.page.height - MARGENES.bottom - 40;

  doc.moveTo(MARGENES.left, y - 10).lineTo(doc.page.width - MARGENES.right, y - 10).lineWidth(0.5).strokeColor('#C9CDD2').stroke();

  doc.font('Helvetica').fontSize(7).fillColor('#5A6068');
  doc.text('Rio Grijalva No. 5312 Int.1, Jardines de San Manuel, C.P. 72570', MARGENES.left, y, { width: 340, lineGap: 1 });
  doc.text('Puebla, Puebla T: (222) 2461703, 2460215, 2468297,2422564', MARGENES.left, doc.y, { width: 340, lineGap: 1 });
  doc.text('www.soapap.gob.mx', MARGENES.left, doc.y, { width: 340, lineGap: 1 });
  doc.fillColor('#000000');

  doc.image(LOGOS.gobiernoPuebla, doc.page.width - MARGENES.right - 90, y - 3, { fit: [90, 36] });
}
