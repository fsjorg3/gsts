import { describe, expect, it } from 'vitest';
import { mimeRealCoincide } from '../../src/shared/mime-real.js';

describe('mimeRealCoincide', () => {
  it('acepta un PDF real declarado como application/pdf', () => {
    expect(mimeRealCoincide(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]), 'application/pdf')).toBe(true);
  });

  it('acepta un JPEG real declarado como image/jpeg', () => {
    expect(mimeRealCoincide(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true);
  });

  it('acepta un PNG real declarado como image/png', () => {
    expect(mimeRealCoincide(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true);
  });

  it('rechaza cuando el contenido no coincide con el mime declarado', () => {
    expect(mimeRealCoincide(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'application/pdf')).toBe(false);
  });

  it('rechaza un mime fuera del allow-list', () => {
    expect(mimeRealCoincide(Buffer.from([0x50, 0x4b, 0x03, 0x04]), 'application/zip')).toBe(false);
  });
});
