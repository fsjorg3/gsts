import { describe, expect, it } from 'vitest';
import { ComprobanteInvalidoError, nombreConExtension, normalizarComprobante } from './comprobante';

// Bytes de cabecera reales: es lo único que GAF mira para decidir el tipo, así
// que basta con la firma para ejercitar la detección.
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46];

const blobDe = (bytes: number[]) => new Blob([new Uint8Array(bytes)]);

describe('nombreConExtension', () => {
  it('agrega la extensión cuando el nombre no la trae', () => {
    expect(nombreConExtension('ticket', '.pdf')).toBe('ticket.pdf');
  });

  it('no la duplica cuando ya está presente', () => {
    expect(nombreConExtension('ticket.pdf', '.pdf')).toBe('ticket.pdf');
  });

  it('normaliza una extensión en mayúsculas sin duplicarla', () => {
    expect(nombreConExtension('TICKET.PDF', '.pdf')).toBe('TICKET.pdf');
  });

  it('reemplaza .jpeg por la extensión canónica del contenido', () => {
    expect(nombreConExtension('foto.jpeg', '.jpg')).toBe('foto.jpg');
  });

  it('descarta la ruta y se queda con el último segmento (busboy haría lo mismo)', () => {
    expect(nombreConExtension('C:\\Users\\ana\\ticket.pdf', '.pdf')).toBe('ticket.pdf');
    expect(nombreConExtension('/tmp/scans/ticket', '.pdf')).toBe('ticket.pdf');
  });

  it('elimina caracteres de control, que GAF rechaza', () => {
    expect(nombreConExtension('tic\u0000ket\n', '.pdf')).toBe('ticket.pdf');
  });

  it('usa un nombre de respaldo cuando no queda nada utilizable', () => {
    expect(nombreConExtension('', '.pdf')).toBe('comprobante.pdf');
    expect(nombreConExtension('   ', '.pdf')).toBe('comprobante.pdf');
    expect(nombreConExtension('.pdf', '.pdf')).toBe('comprobante.pdf');
  });

  it('recorta el nombre para no pasar del límite de 255 de GAF', () => {
    const resultado = nombreConExtension('a'.repeat(400), '.pdf');
    expect(resultado.length).toBe(255);
    expect(resultado.endsWith('.pdf')).toBe(true);
  });
});

describe('normalizarComprobante', () => {
  it('detecta el tipo por los bytes y fija el MIME explícitamente', async () => {
    const archivo = await normalizarComprobante(blobDe(PDF), 'ticket');

    expect(archivo.type).toBe('application/pdf');
    expect(archivo.name).toBe('ticket.pdf');
  });

  it('hace ganar al contenido cuando la extensión del nombre lo contradice', async () => {
    // Es el caso que rompía en GAF: un PDF llamado .png pasaba el filtro de
    // GSTS pero fallaba el cruce extensión-vs-contenido del otro lado.
    const archivo = await normalizarComprobante(blobDe(PDF), 'ticket.png');

    expect(archivo.type).toBe('application/pdf');
    expect(archivo.name).toBe('ticket.pdf');
  });

  it('reconoce PNG y JPEG con su extensión canónica', async () => {
    await expect(normalizarComprobante(blobDe(PNG), 'captura')).resolves.toMatchObject({
      name: 'captura.png',
      type: 'image/png',
    });
    await expect(normalizarComprobante(blobDe(JPEG), 'foto')).resolves.toMatchObject({
      name: 'foto.jpg',
      type: 'image/jpeg',
    });
  });

  it('rechaza un archivo cuyo contenido no es de un tipo aceptado', async () => {
    await expect(normalizarComprobante(blobDe([0x68, 0x6f, 0x6c, 0x61]), 'notas.pdf')).rejects.toBeInstanceOf(
      ComprobanteInvalidoError,
    );
  });

  it('rechaza un archivo que excede el límite por archivo de GAF', async () => {
    const grande = new Blob([new Uint8Array(PDF), new Uint8Array(10 * 1024 * 1024)]);

    await expect(normalizarComprobante(grande, 'ticket.pdf')).rejects.toBeInstanceOf(ComprobanteInvalidoError);
  });
});
