import type { DomicilioPredio } from './tipos.js';

// Helpers de presentación compartidos por las plantillas. Puros y sin I/O para
// poder probarlos sin generar un PDF.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const;

/**
 * Fecha larga en español ("24 de julio de 2026"). Se fija la zona horaria de
 * Puebla: las fechas se guardan en timestamptz y formatearlas en UTC correría
 * el día impreso en el documento durante las últimas horas de la tarde.
 */
export function formatearFechaLarga(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  const mes = MESES[Number(valor('month')) - 1] ?? '';
  return `${Number(valor('day'))} de ${mes} de ${valor('year')}`;
}

/**
 * Arma la referencia del predio para el cuerpo de la constancia:
 * "CALLE 12 NORTE 612, COLONIA CENTRO, perteneciente a LA JUNTA AUXILIAR SAN
 * BALTAZAR CAMPECHE, PUEBLA".
 *
 * No hay catálogo de juntas auxiliares ni municipios: la zona de cobertura
 * abarca Puebla y cuatro municipios más, así que el nombre es texto libre que
 * ventanilla captura en mayúsculas. El sufijo ", PUEBLA" es el estado y es
 * constante — SOAPAP no opera fuera de él.
 */
export function formatearDomicilio(domicilio: DomicilioPredio): string {
  const calleNumero = [domicilio.calle, domicilio.numero].filter(Boolean).join(' ').trim();
  const partes = [calleNumero, domicilio.colonia].filter((parte) => Boolean(parte) && parte !== '');

  if (domicilio.perteneceANombre) {
    const articulo = domicilio.perteneceA === 'MUNICIPIO' ? 'EL MUNICIPIO' : 'LA JUNTA AUXILIAR';
    partes.push(`perteneciente a ${articulo} ${domicilio.perteneceANombre}`);
  }

  const linea = partes.join(', ');
  return linea ? `${linea}, PUEBLA` : 'PUEBLA';
}
