/// Compuerta de decisión para el alta manual en el catálogo offline del
/// padrón al crear un trámite: sólo aplica a No Adeudo con NIS y domicilio
/// completo capturados. No decide si el NIS ya existe en el catálogo (eso
/// exige una consulta a Prisma, fuera del alcance de una función pura) ni
/// arma los datos a insertar — ambos siguen en el router, son pegamento de
/// base de datos, no lógica de negocio.
export interface DatosParaAltaPadronManual {
  tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO';
  nis?: string;
  domicilioCalle?: string;
  domicilioNumero?: string;
  domicilioColonia?: string;
}

interface DatosParaAltaPadronManualCompletos {
  nis: string;
  domicilioCalle: string;
  domicilioNumero: string;
  domicilioColonia: string;
}

/** Type guard (no sólo boolean): además de la compuerta, le devuelve al
 * llamador `nis`/`domicilio*` ya angostados a `string`, para que el resto del
 * bloque en el router no necesite aserciones no-nulas. */
export function requierePadronOfflineManual<T extends DatosParaAltaPadronManual>(
  input: T,
): input is T & DatosParaAltaPadronManualCompletos {
  return (
    input.tipoConstancia === 'NO_ADEUDO'
    && Boolean(input.nis)
    && Boolean(input.domicilioCalle)
    && Boolean(input.domicilioNumero)
    && Boolean(input.domicilioColonia)
  );
}
