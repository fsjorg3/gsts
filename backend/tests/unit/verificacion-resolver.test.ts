import { describe, expect, it } from 'vitest';
import { resolverVerificacion, type ConstanciaVerificable } from '../../src/modules/publico/verificacion.js';

const AHORA = new Date('2026-07-24T12:00:00.000Z');

function constancia(overrides: Partial<ConstanciaVerificable> = {}): ConstanciaVerificable {
  return {
    folioUnico: 'SICEF-42-A1B2C3D4',
    vigenciaFin: new Date('2027-01-15T00:00:00.000Z'),
    anulada: false,
    tipoConstancia: 'NO_ADEUDO',
    titularNombreRazonSocial: 'Juan Pérez Salinas',
    domicilio: { calle: 'AV REFORMA', numero: '612-1', colonia: 'CENTRO', perteneceA: 'MUNICIPIO', perteneceANombre: 'PUEBLA' },
    ...overrides,
  };
}

function exito(resultado: ReturnType<typeof resolverVerificacion>) {
  if (resultado.status !== 200) throw new Error(`Se esperaba 200 y llegó ${resultado.status}`);
  return resultado.body.data;
}

describe('resolverVerificacion · estados', () => {
  it('devuelve 200 VIGENTE cuando la vigencia no ha terminado', () => {
    expect(exito(resolverVerificacion(constancia(), true, AHORA)).estado).toBe('VIGENTE');
  });

  it('devuelve 200 VENCIDA —no 404— cuando la vigencia ya pasó', () => {
    const vencida = resolverVerificacion(constancia({ vigenciaFin: new Date('2026-01-01T00:00:00.000Z') }), true, AHORA);
    expect(vencida.status).toBe(200);
    expect(exito(vencida).estado).toBe('VENCIDA');
  });

  it('devuelve 200 ANULADA aunque la vigencia siga corriendo', () => {
    expect(exito(resolverVerificacion(constancia({ anulada: true }), true, AHORA)).estado).toBe('ANULADA');
  });
});

describe('resolverVerificacion · no enumerabilidad', () => {
  it('responde 404 idéntico ante folio inexistente y ante token inválido', () => {
    const folioInexistente = resolverVerificacion(null, true, AHORA);
    const tokenInvalido = resolverVerificacion(constancia(), false, AHORA);
    const ambos = resolverVerificacion(null, false, AHORA);

    expect(folioInexistente.status).toBe(404);
    // La igualdad estricta entre los tres cuerpos es el requisito: si divergieran,
    // el endpoint confirmaría qué folios existen y volvería a ser enumerable.
    expect(tokenInvalido).toEqual(folioInexistente);
    expect(ambos).toEqual(folioInexistente);
  });

  it('no filtra el folio consultado en el cuerpo del 404', () => {
    const fallo = resolverVerificacion(null, false, AHORA);
    expect(JSON.stringify(fallo.body)).not.toContain('SICEF');
  });
});

describe('resolverVerificacion · datos expuestos', () => {
  it('expone exactamente las llaves acordadas en No Adeudo', () => {
    const data = exito(resolverVerificacion(constancia({ tipoConstancia: 'NO_ADEUDO' }), true, AHORA));
    // Igualdad de llaves, no lista negra: un campo agregado por descuido rompe
    // esta prueba en vez de filtrarse en silencio a una ruta pública.
    expect(Object.keys(data).sort()).toEqual(['estado', 'folio', 'tipo', 'titular', 'valido', 'vigenciaHasta']);
  });

  it('agrega el domicilio del predio sólo en No Registro', () => {
    const noRegistro = exito(resolverVerificacion(constancia({ tipoConstancia: 'NO_REGISTRO' }), true, AHORA));
    expect(Object.keys(noRegistro).sort()).toEqual(['domicilio', 'estado', 'folio', 'tipo', 'titular', 'valido', 'vigenciaHasta']);
    expect(noRegistro.domicilio).toEqual({ calle: 'AV REFORMA', numero: '612-1', colonia: 'CENTRO', perteneceA: 'MUNICIPIO', perteneceANombre: 'PUEBLA' });
  });

  it('omite la llave domicilio en No Adeudo, ni siquiera como null', () => {
    const data = exito(resolverVerificacion(constancia({ tipoConstancia: 'NO_ADEUDO' }), true, AHORA));
    expect('domicilio' in data).toBe(false);
  });

  it('incluye el nombre del titular para dar certeza de titularidad', () => {
    expect(exito(resolverVerificacion(constancia(), true, AHORA)).titular).toEqual({ nombreRazonSocial: 'Juan Pérez Salinas' });
  });

  it('no expone RFC, identificadores internos ni hashes en ningún nivel', () => {
    const serializado = JSON.stringify(resolverVerificacion(constancia({ tipoConstancia: 'NO_REGISTRO' }), true, AHORA).body);
    for (const prohibido of ['rfc', 'personaId', 'persona_id', 'tramiteId', 'tramite_id', 'nis', 'hashContenido', 'hashPdf', 'archivoUuid', '"id"']) {
      expect(serializado, prohibido).not.toContain(prohibido);
    }
  });
});
