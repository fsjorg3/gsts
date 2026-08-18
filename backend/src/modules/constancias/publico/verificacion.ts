import type { VerificacionConstanciaPublica } from '@sicef/contracts';

// Decisión de la verificación pública, aislada del router para poder probarla
// sin base de datos ni HTTP. El router sólo consulta, delega aquí y responde.

/**
 * Proyección mínima que el router debe consultar. Deliberadamente NO incluye
 * rfc, personaId, tramiteId, nis ni los hashes: lo que no se selecciona no se
 * puede filtrar por descuido en la respuesta.
 */
export interface ConstanciaVerificable {
  folioUnico: string;
  vigenciaFin: Date;
  anulada: boolean;
  tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO';
  titularNombreRazonSocial: string;
  domicilio: {
    calle: string | null;
    numero: string | null;
    colonia: string | null;
    perteneceA: 'JUNTA_AUXILIAR' | 'MUNICIPIO' | null;
    perteneceANombre: string | null;
  };
}

export type ResultadoVerificacion =
  | { status: 200; body: { data: VerificacionConstanciaPublica } }
  | { status: 404; body: { error: { code: string; message: string } } };

// Cuerpo único para todos los fallos. Un folio inexistente y un token incorrecto
// deben ser indistinguibles: si difirieran, el endpoint confirmaría qué folios
// existen y volvería a ser enumerable.
const NO_ENCONTRADA: ResultadoVerificacion = {
  status: 404,
  body: { error: { code: 'NOT_FOUND', message: 'No se encontró una constancia para el folio y token proporcionados' } },
};

export function resolverVerificacion(
  constancia: ConstanciaVerificable | null,
  tokenValido: boolean,
  ahora: Date,
): ResultadoVerificacion {
  if (!constancia || !tokenValido) return NO_ENCONTRADA;

  // Una constancia vencida o anulada sí existe: responde 200 con su estado real.
  // Devolver 404 escondería información que el titular necesita.
  const estado = constancia.anulada ? 'ANULADA' : constancia.vigenciaFin >= ahora ? 'VIGENTE' : 'VENCIDA';

  return {
    status: 200,
    body: {
      data: {
        valido: true,
        folio: constancia.folioUnico,
        tipo: constancia.tipoConstancia,
        estado,
        vigenciaHasta: constancia.vigenciaFin.toISOString(),
        titular: { nombreRazonSocial: constancia.titularNombreRazonSocial },
        // El domicilio del predio sólo aplica a No Registro; en No Adeudo la
        // referencia del inmueble es el NIS, que no se expone.
        ...(constancia.tipoConstancia === 'NO_REGISTRO' ? { domicilio: constancia.domicilio } : {}),
      },
    },
  };
}
