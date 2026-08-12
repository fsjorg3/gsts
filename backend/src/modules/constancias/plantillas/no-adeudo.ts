import { renderDocumento } from './documento.js';
import { formatearDomicilio } from './formato.js';
import type { DatosPlantillaConstancia, Parrafo } from './tipos.js';

// Constancia de no adeudo.
//
// El texto proviene literalmente de documentacion/constancia_no-adeudo.txt,
// transcrito del documento que SOAPAP emite hoy, y NO debe parafrasearse.
//
// A diferencia de No Registro, este cuerpo nombra al titular y su NIS: el
// router se niega a emitir si el trámite no trae NIS, en vez de imprimir un
// hueco en un documento oficial.

export const TITULO_NO_ADEUDO = 'Constancia de no adeudo';

/**
 * Razón social de la concesionaria que presta el servicio. Es parte del texto
 * aprobado, no un dato configurable: cambiarla es cambiar el documento.
 * «Agua de Puebla» es el nombre comercial; aquí va el de la persona moral.
 */
const CONCESIONARIA = 'CONCESIONES INTEGRALES S.A. DE C.V.';

/**
 * Cuerpo de la constancia como párrafos sueltos. Función pura para poder
 * compararla contra el texto autoritativo en una prueba, sin generar un PDF.
 */
export function parrafosNoAdeudo(datos: DatosPlantillaConstancia): Parrafo[] {
  // formatearDomicilio ya cierra con «perteneciente a EL MUNICIPIO / LA JUNTA
  // AUXILIAR …», que en el formato original venía como un hueco aparte.
  const domicilio = datos.domicilio ? formatearDomicilio(datos.domicilio) : '';
  return [
    { texto: `El presente documento hace constar que el propietario y/o titular de pago ${datos.titular.nombreRazonSocial} usuario ligado al número de suministro ${datos.nis ?? ''} correspondiente a la propiedad ubicada en ${domicilio} ha realizado el pago total de los servicios que le presta la Empresa “${CONCESIONARIA}”, en el domicilio arriba citado hasta el período actual correspondiente a la fecha en que se suscribe esta constancia, por lo que en este momento no presenta adeudo alguno corriente o vencido por los servicios referidos.` },
    { texto: 'Lo anterior se concluye de la revisión hecha a la cuenta en la base de datos del padrón de usuarios.' },
    { texto: '“Este Sistema Operador se reserva el derecho de generar cargos a la cuenta, en aquellos casos donde se detecta el uso de los servicios para fines distintos a los contratados; cuando existan derivaciones no reportadas; alteraciones en los aparatos de medición; descuentos o bonificaciones no procedentes; así como el pago de últimos adeudos y/o el costo del presente formato mediante documentos no cobrables, por lo que la presente constancia no libera al titular del suministro de cubrir los pagos procedentes al incurrir en cualquiera de estos supuestos.”' },
    { texto: `Cabe destacar que dicha constancia cuenta con una vigencia de ${datos.vigenciaDias} días a partir de su fecha de expedición.`, enfasis: 'negritas' },
    { texto: 'Sin otro particular, le reitero la seguridad de mi atenta y distinguida consideración.' },
  ];
}

export function renderNoAdeudo(doc: PDFKit.PDFDocument, datos: DatosPlantillaConstancia): void {
  renderDocumento(doc, datos, TITULO_NO_ADEUDO, parrafosNoAdeudo(datos));
}
