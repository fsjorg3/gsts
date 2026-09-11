/// Motivo por el que un trámite de No Adeudo no puede emitirse todavía: el
/// cuerpo legal de la constancia nombra el NIS y trae [Domicilio] (ver
/// documentacion/constancia_no-adeudo.txt) — antes que imprimir un hueco en
/// un documento oficial, no se emite. No Registro nunca aplica: su domicilio
/// es su propio dato principal, capturado desde el inicio.
export interface DatosEmisionTramite {
  tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO';
  nis: string | null;
  domicilioCalle: string | null;
  domicilioNumero: string | null;
  domicilioColonia: string | null;
}

export function motivoFaltanteEmisionNoAdeudo(tramite: DatosEmisionTramite): string | null {
  if (tramite.tipoConstancia !== 'NO_ADEUDO') return null;
  if (!tramite.nis?.trim()) {
    return 'La constancia de no adeudo requiere el numero de suministro (NIS) del tramite';
  }
  if (!tramite.domicilioCalle?.trim() || !tramite.domicilioNumero?.trim() || !tramite.domicilioColonia?.trim()) {
    return 'La constancia de no adeudo requiere el domicilio del predio en el tramite';
  }
  return null;
}
