import { Prisma } from '@prisma/client';
import { AppError } from './errors.js';

// Traducción de los errores de Prisma a códigos del contrato.
//
// Vive aparte de errors.ts para que ese archivo —del que depende todo el
// backend— no arrastre el cliente de Prisma.
//
// Las formas de error de aquí NO salen de la documentación: se capturaron
// contra una base real corriendo Prisma 7 con el driver adapter
// `@prisma/adapter-pg`, que las envuelve distinto a lo que documenta el motor
// clásico. Lo importante:
//
//   · Toda la información útil está en `meta.driverAdapterError.cause`, no en
//     el nivel superior del error.
//   · Un `RAISE EXCEPTION` de trigger NO llega como P2010 ni como error
//     desconocido: llega como **P2039** con `cause.originalCode === 'P0001'`.
//   · Un CHECK llega también como P2039, pero con el SQLSTATE 23514.
//     Distinguirlos exige mirar `originalCode`, no el código de Prisma.
//   · El `message` de nivel superior incluye la ruta del archivo fuente y un
//     fragmento del código que originó la consulta. Nunca se reenvía.

/** Lo que el driver adapter deja en `meta.driverAdapterError.cause`. */
interface CausaAdaptador {
  originalCode?: string;
  originalMessage?: string;
  /** Presente en violaciones de unicidad y de llave foránea. */
  constraint?: { fields?: string[]; index?: string };
  /**
   * En un CHECK, Postgres incluye aquí la fila completa que falló, con todos
   * sus valores. Se declara para dejar constancia de que existe y de que
   * jamás debe salir en una respuesta.
   */
  detail?: string;
}

function causaAdaptador(error: Prisma.PrismaClientKnownRequestError): CausaAdaptador {
  const envoltorio = error.meta?.['driverAdapterError'] as { cause?: CausaAdaptador } | undefined;
  return envoltorio?.cause ?? {};
}

/** Tope defensivo: un mensaje de trigger razonable no pasa de una línea. */
const LARGO_MAXIMO_MENSAJE = 300;

/**
 * Traduce un error de Prisma a un `AppError` del contrato.
 *
 * Devuelve `undefined` cuando no lo reconoce, para que el manejador central lo
 * siga tratando como 500: es preferible un error interno honesto a un 4xx
 * inventado que le diga al cliente que la culpa fue suya.
 */
export function traducirErrorPrisma(error: unknown): AppError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  const causa = causaAdaptador(error);
  const modelo = typeof error.meta?.['modelName'] === 'string' ? (error.meta['modelName'] as string) : undefined;

  switch (error.code) {
    // Violación de unicidad. `constraint.fields` trae los nombres de columna
    // reales, que es lo que permite a la UI señalar el campo en conflicto.
    // Nunca se incluye el valor duplicado.
    case 'P2002': {
      const campos = causa.constraint?.fields ?? [];
      return new AppError(
        409,
        'UNIQUE_CONFLICT',
        campos.length > 0
          ? `Ya existe un registro con ese valor en: ${campos.join(', ')}`
          : 'Ya existe un registro con ese valor',
        campos.length > 0 ? { campos, modelo } : undefined,
      );
    }

    // Llave foránea: o se apunta a algo que no existe, o se intenta borrar
    // algo que todavía está referenciado.
    case 'P2003':
    case 'P2014':
      return new AppError(
        409,
        'REFERENCE_CONFLICT',
        'La operación choca con una referencia entre registros: el destino no existe o todavía está en uso',
        modelo ? { modelo } : undefined,
      );

    case 'P2025':
      return new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');

    case 'P2000':
      return new AppError(422, 'VALIDATION_ERROR', 'Un valor excede la longitud permitida por la base de datos');

    // P2039 es el cajón genérico de «error de base de datos» en Prisma 7: aquí
    // caen tanto las reglas de negocio de migration_complementaria.sql como
    // los CHECK. El SQLSTATE los separa.
    case 'P2039':
      return traducirErrorDeBase(causa);

    default:
      return undefined;
  }
}

function traducirErrorDeBase(causa: CausaAdaptador): AppError | undefined {
  switch (causa.originalCode) {
    // P0001 = raise_exception. Es una regla de negocio de la capa
    // complementaria, y su mensaje está escrito en español y para leerse
    // («No se modifica la estructura de un catalogo publicado»). El adaptador
    // lo entrega ya limpio, sin CONTEXT ni rastro de plpgsql, así que se
    // reenvía tal cual. verificacion_integridad.sql fija estos mensajes caso
    // por caso, de modo que no pueden cambiar en silencio.
    case 'P0001': {
      const mensaje = causa.originalMessage?.trim();
      return new AppError(
        409,
        'RULE_VIOLATION',
        mensaje && mensaje.length > 0 && mensaje.length <= LARGO_MAXIMO_MENSAJE
          ? mensaje
          : 'La operación viola una regla de negocio de la base de datos',
      );
    }

    // 23514 = check_violation. Aquí NO se reenvía el mensaje: nombra la
    // restricción («violates check constraint "chk_tarifa_monto"»), que no le
    // dice nada a nadie, y viene acompañado de un `detail` con la fila
    // completa y todos sus valores.
    case '23514':
      return new AppError(422, 'RULE_VIOLATION', 'Un valor no cumple las restricciones de la base de datos');

    default:
      return undefined;
  }
}
