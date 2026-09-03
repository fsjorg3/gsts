import { describe, expect, it } from 'vitest';
import { validacionNoRegistroRequestSchema, validacionRequestSchema } from '@gsts/contracts';

const evidencia = { base64: 'ZmFrZQ==', nombreOriginal: 'consulta.png', mimeType: 'image/png' };

describe('validacionRequestSchema', () => {
  it('acepta un registro completo con evidenciaOuc', () => {
    const validacion = validacionRequestSchema.parse({
      metodo: 'MANUAL',
      momento: 'VALIDACION_INICIAL',
      resultado: 'SIN_ADEUDO',
      evidenciaOuc: evidencia,
    });
    expect(validacion.evidenciaOuc.nombreOriginal).toBe('consulta.png');
  });

  it('rechaza sin evidenciaOuc: ya no es un folio de texto opcional', () => {
    expect(() => validacionRequestSchema.parse({ metodo: 'MANUAL', momento: 'VALIDACION_INICIAL', resultado: 'SIN_ADEUDO' })).toThrow();
  });

  it('rechaza un objeto evidenciaOuc incompleto', () => {
    expect(() =>
      validacionRequestSchema.parse({ metodo: 'MANUAL', momento: 'VALIDACION_INICIAL', resultado: 'SIN_ADEUDO', evidenciaOuc: { base64: 'ZmFrZQ==' } }),
    ).toThrow();
  });
});

describe('validacionNoRegistroRequestSchema', () => {
  it('acepta un registro completo con evidenciaOuc', () => {
    const validacion = validacionNoRegistroRequestSchema.parse({
      metodo: 'MANUAL',
      momento: 'REVALIDACION_COBRO',
      resultado: 'SIN_REGISTRO',
      evidenciaOuc: evidencia,
    });
    expect(validacion.evidenciaOuc.mimeType).toBe('image/png');
  });

  it('rechaza sin evidenciaOuc', () => {
    expect(() => validacionNoRegistroRequestSchema.parse({ metodo: 'MANUAL', momento: 'VALIDACION_INICIAL', resultado: 'SIN_REGISTRO' })).toThrow();
  });
});
