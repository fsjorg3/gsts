import { describe, expect, it } from 'vitest';
import { tieneRevalidacion, tieneRevalidacionNegativa, tieneValidacionInicial } from './api';
import type { TramiteDetalle } from '@/features/tramites/api';

// Sólo se leen tipoConstancia y los dos arreglos; el resto se castea.
const tramite = (
  tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO',
  noAdeudo: Array<{ momento: string; resultado: string }>,
  noRegistro: Array<{ momento: string; resultado: string }>,
) => ({ tipoConstancia, validacionesNoAdeudo: noAdeudo, validacionesNoRegistro: noRegistro }) as unknown as TramiteDetalle;

describe('predicados de validación por tipo', () => {
  it('No Adeudo mira validacionesNoAdeudo con SIN_ADEUDO', () => {
    const t = tramite('NO_ADEUDO', [{ momento: 'VALIDACION_INICIAL', resultado: 'SIN_ADEUDO' }], []);
    expect(tieneValidacionInicial(t)).toBe(true);
  });

  it('No Registro mira validacionesNoRegistro con SIN_REGISTRO', () => {
    const t = tramite('NO_REGISTRO', [], [{ momento: 'VALIDACION_INICIAL', resultado: 'SIN_REGISTRO' }]);
    expect(tieneValidacionInicial(t)).toBe(true);
  });

  it('cada tipo ignora el arreglo del otro', () => {
    // Un No Registro con la validación puesta (por error) en el arreglo de No Adeudo no cuenta.
    const t = tramite('NO_REGISTRO', [{ momento: 'VALIDACION_INICIAL', resultado: 'SIN_ADEUDO' }], []);
    expect(tieneValidacionInicial(t)).toBe(false);
  });

  it('el resultado negativo no satisface la validación inicial', () => {
    const adeudo = tramite('NO_ADEUDO', [{ momento: 'VALIDACION_INICIAL', resultado: 'CON_ADEUDO' }], []);
    const registro = tramite('NO_REGISTRO', [], [{ momento: 'VALIDACION_INICIAL', resultado: 'CON_REGISTRO' }]);
    expect(tieneValidacionInicial(adeudo)).toBe(false);
    expect(tieneValidacionInicial(registro)).toBe(false);
  });

  it('revalidación al cobro: positiva y negativa por tipo', () => {
    const ok = tramite('NO_REGISTRO', [], [{ momento: 'REVALIDACION_COBRO', resultado: 'SIN_REGISTRO' }]);
    expect(tieneRevalidacion(ok)).toBe(true);
    expect(tieneRevalidacionNegativa(ok)).toBe(false);

    const hallazgo = tramite('NO_ADEUDO', [{ momento: 'REVALIDACION_COBRO', resultado: 'CON_ADEUDO' }], []);
    expect(tieneRevalidacion(hallazgo)).toBe(false);
    expect(tieneRevalidacionNegativa(hallazgo)).toBe(true);
  });
});
