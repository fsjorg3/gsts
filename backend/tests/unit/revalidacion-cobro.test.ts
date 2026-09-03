import { describe, expect, it } from 'vitest';
import { calcularRequiereRevalidacionCobro } from '../../src/modules/constancias/tramites/revalidacion-cobro.js';

const ahora = new Date('2026-01-01T12:00:00.000Z');

describe('calcularRequiereRevalidacionCobro', () => {
  it('no exige revalidación fuera de APROBADO', () => {
    expect(calcularRequiereRevalidacionCobro({ estado: 'COBRO', aprobadoEn: null, graciaMinutos: 10, configuracionActiva: true }, ahora)).toBe(false);
  });

  it('exige revalidación si no hay ancla de aprobación (fila legada)', () => {
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn: null, graciaMinutos: 10, configuracionActiva: true }, ahora)).toBe(true);
  });

  it('no exige revalidación dentro de la ventana de gracia', () => {
    const aprobadoEn = new Date(ahora.getTime() - 5 * 60_000);
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn, graciaMinutos: 10, configuracionActiva: true }, ahora)).toBe(false);
  });

  it('exige revalidación justo al vencer la ventana de gracia (límite incluido)', () => {
    // Ventana [aprobadoEn, aprobadoEn+gracia): al llegar exactamente al límite
    // ya se exige, no un instante después — evita el empate now()==aprobadoEn
    // que ocurriría si aprobar y cobrar cayeran en la misma transacción.
    const aprobadoEn = new Date(ahora.getTime() - 10 * 60_000);
    const unMilisegundoAntes = new Date(ahora.getTime() - 1);
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn, graciaMinutos: 10, configuracionActiva: true }, unMilisegundoAntes)).toBe(false);
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn, graciaMinutos: 10, configuracionActiva: true }, ahora)).toBe(true);
  });

  it('exige revalidación si la configuración de plazos no está activa, aunque haya gracia configurada', () => {
    const aprobadoEn = new Date(ahora.getTime() - 1 * 60_000);
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn, graciaMinutos: 10, configuracionActiva: false }, ahora)).toBe(true);
  });

  it('exige revalidación siempre con gracia en 0 (comportamiento por defecto), incluso en un empate exacto', () => {
    const aprobadoEn = ahora;
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn, graciaMinutos: 0, configuracionActiva: true }, ahora)).toBe(true);
    expect(calcularRequiereRevalidacionCobro({ estado: 'APROBADO', aprobadoEn, graciaMinutos: 0, configuracionActiva: true }, new Date(ahora.getTime() + 1))).toBe(true);
  });
});
