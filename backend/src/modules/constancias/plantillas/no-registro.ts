import { renderDocumento } from './documento.js';
import { formatearDomicilio } from './formato.js';
import type { DatosPlantillaConstancia, Parrafo } from './tipos.js';

// Constancia de predio no registrado.
//
// El texto proviene literalmente de documentacion/constancia_no-registro.txt,
// transcrito del documento que SOAPAP emite hoy, y NO debe parafrasearse ni
// "corregirse": son citas de artículos específicos y su redacción es la
// aprobada. Lo único variable son los placeholders.
//
// Ojo con los dos plazos del cuerpo: el "30 días naturales" del tercer párrafo
// es el que tiene el interesado para dar aviso de cambios —fijo, parte del
// texto legal— y el del quinto es la vigencia del documento, configurable por
// TI y por eso interpolada. No son el mismo número aunque hoy coincidan.
//
// Ojo también con las dos citas del tercer párrafo: las infracciones están en
// el artículo 128 y la sanción en el 130. Son distintos a propósito.

export const TITULO_NO_REGISTRO = 'Constancia de predio no registrado';

/**
 * Cuerpo de la constancia como párrafos sueltos. Función pura para poder
 * compararla contra el texto autoritativo en una prueba, sin generar un PDF.
 */
export function parrafosNoRegistro(datos: DatosPlantillaConstancia): Parrafo[] {
  const domicilio = datos.domicilio ? formatearDomicilio(datos.domicilio) : '';
  return [
    { texto: `Con fundamento en lo dispuesto por el artículo 8 de la Constitución Política de los Estados Unidos Mexicanos, 1, 2, 4, 5 Fracción V, 6 y 28 Fracción XXIV del Reglamento Interior del Sistema Operador de los Servicios de Agua Potable y Alcantarillado del Municipio de Puebla, y con respecto al predio ubicado en ${domicilio}; hago de su conocimiento lo siguiente:` },
    { texto: 'En una minuciosa revisión al sistema para verificar la existencia de registro del citado predio, se observó que no existe registro alguno, dando como consecuencia que no tengo número de cuenta asignado.' },
    { texto: 'El interesado deberá dar aviso durante los primeros 30 días naturales a esta Autoridad sobre cualquier cambio realizado al predio, con la finalidad de emitir la facturación correspondiente por los servicios que proporciona este Organismo, los interesados deberán celebrar el contrato respectivo del servicio que se trate, así como cumplir con los requisitos y condiciones que establecen los artículos 43, 44, 45 y 48 de la Ley del Agua para el Estado de Puebla respectivamente, evitando incurrir en las infracciones previstas en el artículo 128, fracciones VI, VII, XXXV y XLI mismas que serán sancionadas conforme a lo dispuesto del artículo 130 de dicho ordenamiento.' },
    { texto: 'No omito manifestar que la presente Constancia, no exime al interesado de responsabilidad alguna respecto a las obligaciones que pudiera tener con este Sistema Operador, derivado de una visita de inspección o verificación de la que podrá ser sujeto el predio en cuestión, a partir de la emisión del presente documento.', enfasis: 'negritas-subrayado' },
    { texto: `Cabe destacar que dicha constancia cuenta con una vigencia de ${datos.vigenciaDias} días a partir de su fecha de expedición.` },
    { texto: 'Sin otro particular, le reitero la seguridad de mi atenta y distinguida consideración.' },
  ];
}

export function renderNoRegistro(doc: PDFKit.PDFDocument, datos: DatosPlantillaConstancia): void {
  renderDocumento(doc, datos, TITULO_NO_REGISTRO, parrafosNoRegistro(datos));
}
