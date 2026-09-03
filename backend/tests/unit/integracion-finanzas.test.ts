import { describe, expect, it } from 'vitest';
import { cobroPorFolioDto, rolesCliente, rolesRealm, rolesSicef } from '@gsts/contracts';

// Campos que nunca deben viajar hacia el sistema Finanzas. La lista se afirma
// en negativo a propósito: comprobar sólo los campos esperados dejaría pasar a
// quien *agregue* un dato personal al DTO más adelante.
const PROHIBIDOS = [
  'receptorRfc', 'receptorNombre', 'receptorCp', 'receptorRegimen',
  'rfc', 'nombre', 'nombreRazonSocial', 'titular', 'personas',
  'nis', 'domicilioCalle', 'domicilioNumero', 'domicilioColonia',
  'tramiteId', 'personaId', 'cobroId', 'id', 'creadoPorId', 'cobradoPorId',
];

describe('contrato de la consulta de cobro por folio', () => {
  const campos = Object.keys(cobroPorFolioDto.shape);

  it('no expone datos personales ni identificadores internos', () => {
    expect(campos.filter((campo) => PROHIBIDOS.includes(campo))).toEqual([]);
  });

  it('se llavea por el folio de la constancia, no por la referencia de pago', () => {
    // El folio es único e impreso en el documento; referenciaPago es texto
    // libre y sin unicidad (aunque ya obligatorio) — viaja como dato, nunca
    // como llave.
    expect(campos).toContain('folioConstancia');
  });

  it('incluye los metadatos del comprobante, sin sus bytes', () => {
    expect(campos).toContain('comprobante');
    // Los bytes se piden en /comprobante; el JSON sólo describe el archivo.
    expect(campos).not.toContain('comprobanteBase64');
  });
});

describe('roles de SICEF tras el recorte', () => {
  it('ya no reconoce el rol finanzas', () => {
    expect(rolesSicef).not.toContain('finanzas');
  });

  it('declara los roles de service account como roles de cliente', () => {
    // Vienen en resource_access.sicef.roles, no en realm_access: son de un
    // cliente concreto, no identidades del realm.
    expect(rolesCliente).toContain('consulta-cobros');
    expect(rolesCliente).toContain('consulta-metricas');
    expect(rolesRealm).not.toContain('consulta-cobros');
  });
});
