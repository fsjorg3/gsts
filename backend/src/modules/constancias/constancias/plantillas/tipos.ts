import type { TipoConstancia } from '@prisma/client';
import { renderNoAdeudo } from './no-adeudo.js';
import { renderNoRegistro } from './no-registro.js';

/**
 * Párrafo del cuerpo legal. El énfasis es presentación, no texto: los archivos
 * autoritativos de `documentacion/` fijan la redacción y no lo marcan.
 */
export interface Parrafo {
  texto: string;
  enfasis?: 'negritas' | 'negritas-subrayado';
}

export interface DomicilioPredio {
  calle: string | null;
  numero: string | null;
  colonia: string | null;
  perteneceA: string | null;
  perteneceANombre: string | null;
}

export interface DatosPlantillaConstancia {
  folioUnico: string;
  emitidaAt: Date;
  vigenciaFin: Date;
  vigenciaDias: number;
  titular: { nombreRazonSocial: string };
  /** Sólo relevante en NO_ADEUDO. */
  nis: string | null;
  /** Sólo relevante en NO_REGISTRO. */
  domicilio: DomicilioPredio | null;
  firmante: { nombre: string; cargo: string };
  /** Prefijo configurado por tipo; el número de oficio impreso es `{oficioPrefijo}/{año de emitidaAt}`. */
  oficioPrefijo: string;
  /** URL pública que codifica el QR impreso. */
  urlVerificacion: string;
  /**
   * QR ya rasterizado a PNG. Se recibe hecho en vez de generarlo aquí para que
   * las plantillas sean funciones de render puras y síncronas: todo el trabajo
   * asíncrono queda en el orquestador (generar.ts).
   */
  qrPng: Buffer;
}

export type PlantillaConstancia = (doc: PDFKit.PDFDocument, datos: DatosPlantillaConstancia) => void;

/**
 * Registro de plantillas por tipo de constancia. Sigue siendo parcial a
 * propósito: un tipo nuevo sin texto legal aprobado responde
 * 409 TEMPLATE_NOT_CONFIGURED en vez de producir un documento con contenido
 * inventado. Hoy los dos tipos existentes están cubiertos.
 */
export const PLANTILLAS: Partial<Record<TipoConstancia, PlantillaConstancia>> = {
  NO_REGISTRO: renderNoRegistro,
  NO_ADEUDO: renderNoAdeudo,
};
