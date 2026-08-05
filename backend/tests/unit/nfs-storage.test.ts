import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NfsStorage } from '../../src/infrastructure/storage/nfs-storage.js';

let raiz: string;
let storage: NfsStorage;

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'sicef-nfs-'));
  storage = new NfsStorage({
    evidencias: join(raiz, 'evidencias'),
    constancias: join(raiz, 'constancias'),
    facturas: join(raiz, 'facturas'),
    comprobantes: join(raiz, 'comprobantes'),
  });
});

afterAll(() => rmSync(raiz, { recursive: true, force: true }));

describe('NfsStorage.leer', () => {
  it('devuelve los mismos bytes que se guardaron', async () => {
    const contenido = Buffer.from('%PDF-1.7 contenido de prueba');
    const guardado = await storage.save('constancias', contenido);

    expect(await storage.leer('constancias', guardado.ruta)).toEqual(contenido);
  });

  it('rechaza rutas fuera del directorio del scope', async () => {
    // La ruta viene de la base de datos, pero una fila corrupta no debe poder
    // convertirse en lectura arbitraria de disco.
    await expect(storage.leer('constancias', join(raiz, 'evidencias', 'archivo'))).rejects.toThrow('Ruta de almacenamiento inválida');
    await expect(storage.leer('constancias', resolve(raiz, 'constancias', '..', 'facturas', 'archivo'))).rejects.toThrow('Ruta de almacenamiento inválida');
  });

  it('propaga el fallo cuando el archivo no existe en disco', async () => {
    await expect(storage.leer('constancias', join(raiz, 'constancias', 'no-existe'))).rejects.toThrow();
  });
});
