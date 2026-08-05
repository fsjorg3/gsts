import { afterEach, describe, expect, it, vi } from 'vitest';
import { abrirBlobEnPestana, descargarBlob, nombreArchivoConstancia } from './descargarArchivo';

const URL_FALSA = 'blob:http://localhost/abc-123';

afterEach(() => vi.restoreAllMocks());

function simularObjectUrl() {
  const crear = vi.fn(() => URL_FALSA);
  const revocar = vi.fn();
  vi.stubGlobal('URL', { ...URL, createObjectURL: crear, revokeObjectURL: revocar });
  return { crear, revocar };
}

describe('descargarBlob', () => {
  it('dispara un enlace de descarga con el nombre indicado y revoca el object URL', () => {
    const { crear, revocar } = simularObjectUrl();
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this);
    });

    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    descargarBlob(blob, 'constancia-SICEF-42-A1B2C3D4.pdf');

    expect(crear).toHaveBeenCalledWith(blob);
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.download).toBe('constancia-SICEF-42-A1B2C3D4.pdf');
    expect(clicks[0]?.href).toBe(URL_FALSA);
    // Sin esto el blob quedaría retenido mientras viva la pestaña.
    expect(revocar).toHaveBeenCalledWith(URL_FALSA);
  });

  it('no deja el enlace sintético en el DOM', () => {
    simularObjectUrl();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    descargarBlob(new Blob(['x']), 'archivo.pdf');

    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('revoca el object URL aunque el click falle', () => {
    const { revocar } = simularObjectUrl();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('fallo del navegador');
    });

    expect(() => descargarBlob(new Blob(['x']), 'archivo.pdf')).toThrow('fallo del navegador');
    expect(revocar).toHaveBeenCalledWith(URL_FALSA);
  });
});

describe('abrirBlobEnPestana', () => {
  it('abre el blob en una pestaña nueva', () => {
    const { crear } = simularObjectUrl();
    const abrir = vi.fn(() => ({}) as Window);
    vi.stubGlobal('open', abrir);

    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    abrirBlobEnPestana(blob);

    expect(crear).toHaveBeenCalledWith(blob);
    expect(abrir).toHaveBeenCalledWith(URL_FALSA, '_blank', 'noopener,noreferrer');
  });

  it('avisa y revoca si el navegador bloquea la ventana emergente', () => {
    const { revocar } = simularObjectUrl();
    vi.stubGlobal('open', vi.fn(() => null));

    expect(() => abrirBlobEnPestana(new Blob(['x']))).toThrow(/ventanas emergentes/i);
    expect(revocar).toHaveBeenCalledWith(URL_FALSA);
  });
});

describe('nombreArchivoConstancia', () => {
  it('usa el folio único de la constancia', () => {
    expect(nombreArchivoConstancia('SICEF-42-A1B2C3D4')).toBe('constancia-SICEF-42-A1B2C3D4.pdf');
  });
});
