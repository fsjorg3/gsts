import { createHash } from 'node:crypto';

// Hash de integridad sobre los DATOS ESTRUCTURADOS de la constancia, no sobre
// los bytes del PDF (para eso está hashPdf). El mismo contenido puede producir
// bytes distintos según cómo se renderice el documento, así que un hash del
// archivo no sirve para afirmar "estos son los datos que registramos".

/**
 * Campos que entran al hash, en orden fijo. **El orden es contrato**: cambiarlo,
 * agregar o quitar un campo invalida el hash de todas las constancias ya
 * emitidas y rompe cualquier recálculo posterior. Si hace falta cambiarlo, se
 * hace con una versión nueva del hash, no editando ésta.
 */
export interface ContenidoConstancia {
  folioUnico: string;
  tipoConstancia: string;
  personaTitularId: string;
  emitidaAt: Date;
  vigenciaInicio: Date;
  vigenciaFin: Date;
}

/**
 * Serializa de forma determinista y devuelve el SHA-256 en hex.
 *
 * Se concatena con `|` en vez de usar JSON.stringify porque el orden de las
 * llaves de un objeto no es parte del contrato del lenguaje: dos ejecuciones
 * podrían serializar distinto y producir hashes diferentes para el mismo dato.
 */
export function calcularHashContenido(contenido: ContenidoConstancia): string {
  const serializado = [
    contenido.folioUnico,
    contenido.tipoConstancia,
    contenido.personaTitularId,
    contenido.emitidaAt.toISOString(),
    contenido.vigenciaInicio.toISOString(),
    contenido.vigenciaFin.toISOString(),
  ].join('|');
  return createHash('sha256').update(serializado, 'utf8').digest('hex');
}
