/// Funciones puras de normalización del extracto trimestral del padrón hacia
/// la forma que ya usa Tramite/DomicilioPredio. Sin I/O para poder probarlas
/// sin un archivo ni una base de datos.

/** Fila cruda tal como la entrega el extracto (columnas acordadas: sin
 * ESTADO —no es fuente confiable, el extracto tiene ~3 meses de atraso— ni
 * las demás columnas descartadas del padrón completo). */
export interface FilaPadronCsv {
  NIS: string;
  FECHA_CONTRATO: string;
  PROPIETARIO: string;
  'TITULAR DE PAGO': string;
  VIA: string;
  CALLE: string;
  NUMERO: string;
  DUPLICADOR: string;
  NUMERO_INTERIOR: string;
  MUNICIPIO: string;
  COLONIA: string;
}

/** Valor con el que el padrón acredita al propietario cuando no conoce su
 * nombre real. Solo el dueño de la cuenta puede acreditarse como titular de
 * una constancia: con este valor no hay nombre que sugerir. */
export const PROPIETARIO_GENERICO = 'AL PROPIETARIO DEL PREDIO';

export function resolverNombreSugerido(propietario: string): string | null {
  const valor = propietario.trim();
  return valor.toUpperCase() === PROPIETARIO_GENERICO ? null : valor;
}

// El padrón usa '0' (además de vacío) como "sin valor" en estos dos campos.
const SIN_VALOR = new Set(['', '0']);

export interface DomicilioNormalizado {
  calle: string;
  numero: string;
  colonia: string;
  perteneceA: 'MUNICIPIO' | null;
  perteneceANombre: string | null;
}

/**
 * Compone el domicilio a la forma que ya usa Tramite/DomicilioPredio y que
 * formatearDomicilio() ya sabe imprimir: VIA+CALLE combinados en `calle`
 * (ej. "CALLE 12 NORTE"), NUMERO_INTERIOR/DUPLICADOR plegados en `numero`.
 * `perteneceA`/`perteneceANombre` solo se llenan si el municipio no es
 * Puebla: formatearDomicilio() ya agrega ", PUEBLA" siempre por defecto.
 */
export function normalizarDomicilio(fila: FilaPadronCsv): DomicilioNormalizado {
  const calle = `${fila.VIA.trim()} ${fila.CALLE.trim()}`.trim();
  const partesNumero = [fila.NUMERO.trim()];
  const numeroInterior = fila.NUMERO_INTERIOR.trim();
  const duplicador = fila.DUPLICADOR.trim();
  if (!SIN_VALOR.has(numeroInterior)) partesNumero.push(`INT. ${numeroInterior}`);
  if (!SIN_VALOR.has(duplicador)) partesNumero.push(duplicador);
  const municipio = fila.MUNICIPIO.trim();
  const esPuebla = municipio.toUpperCase() === 'PUEBLA';
  return {
    calle,
    numero: partesNumero.join(' ').trim(),
    colonia: fila.COLONIA.trim(),
    perteneceA: esPuebla ? null : 'MUNICIPIO',
    perteneceANombre: esPuebla ? null : municipio,
  };
}

/** El extracto trae FECHA_CONTRATO en formato dd/mm/aaaa. UTC a propósito:
 * es solo un dato de contexto, no un instante que deba ubicarse en un huso. */
export function parsearFechaContrato(valor: string): Date | null {
  const partes = valor.trim().split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes.map(Number);
  if (!dia || !mes || !anio) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Date.UTC no rechaza desbordes (ej. 31 de febrero), los normaliza al mes
  // siguiente: se revalida que los componentes sobrevivan intactos.
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return fecha;
}

export interface DatosPadronOffline {
  fechaContrato: Date | null;
  propietario: string;
  titularPago: string | null;
  domicilioCalle: string;
  domicilioNumero: string;
  domicilioColonia: string;
  domicilioPerteneceA: 'MUNICIPIO' | null;
  domicilioPerteneceANombre: string | null;
  origen: 'IMPORTADO';
}

/** Fila lista para upsert: exactamente lo que importarExtractoPadron escribe
 * en ambas ramas (create/update) de cada NIS del extracto. */
export function construirDatosPadron(fila: FilaPadronCsv): DatosPadronOffline {
  const domicilio = normalizarDomicilio(fila);
  return {
    fechaContrato: parsearFechaContrato(fila.FECHA_CONTRATO),
    propietario: fila.PROPIETARIO.trim(),
    titularPago: fila['TITULAR DE PAGO'].trim() || null,
    domicilioCalle: domicilio.calle,
    domicilioNumero: domicilio.numero,
    domicilioColonia: domicilio.colonia,
    domicilioPerteneceA: domicilio.perteneceA,
    domicilioPerteneceANombre: domicilio.perteneceANombre,
    origen: 'IMPORTADO',
  };
}

/**
 * Clasifica una fila del extracto según lo que ya había en el catálogo antes
 * de esta importación. `origenPrevio` es `undefined` cuando el NIS es nuevo.
 * Nunca hay una tercera clasificación "capturado_manual preservado" aquí: eso
 * son los NIS que el extracto NO trae, y se cuentan aparte (ver importar.ts).
 */
export type ClasificacionFilaPadron = 'importado' | 'reclasificado';

export function clasificarFilaPadron(origenPrevio: 'IMPORTADO' | 'CAPTURADO_MANUAL' | undefined): ClasificacionFilaPadron {
  return origenPrevio === 'CAPTURADO_MANUAL' ? 'reclasificado' : 'importado';
}
