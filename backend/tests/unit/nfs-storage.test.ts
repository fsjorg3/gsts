import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NfsStorage, type TramiteUbicacion } from '../../src/infrastructure/storage/nfs-storage.js';

let raiz: string;
let storage: NfsStorage;
let tramite: TramiteUbicacion;

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'sicef-nfs-'));
  storage = new NfsStorage(raiz);
  tramite = { tramiteId: randomUUID(), creadoEn: new Date('2026-03-15T12:00:00Z') };
});

afterAll(() => rmSync(raiz, { recursive: true, force: true }));

describe('NfsStorage.leer', () => {
  it('devuelve los mismos bytes que se guardaron, bajo año/tramiteId/scope', async () => {
    const contenido = Buffer.from('%PDF-1.7 contenido de prueba');
    const guardado = await storage.save('constancias', tramite, contenido);

    expect(guardado.ruta).toBe(join(raiz, '2026', tramite.tramiteId, 'constancias', guardado.archivoUuid));
    expect(await storage.leer('constancias', guardado.ruta)).toEqual(contenido);
  });

  it('rechaza rutas fuera del árbol base', async () => {
    await expect(storage.leer('constancias', join(raiz, '..', 'fuera', 'archivo'))).rejects.toThrow('Ruta de almacenamiento inválida');
    await expect(
      storage.leer('constancias', resolve(raiz, '2026', tramite.tramiteId, 'constancias', '..', '..', 'otro-tramite', 'archivo')),
    ).rejects.toThrow('Ruta de almacenamiento inválida');
  });

  it('rechaza una ruta cuyo scope real no coincide con el pedido', async () => {
    // Sin raíz propia por scope, la validación de scope la hace NfsStorage
    // explícitamente: guardar bajo comprobantes y leer pidiendo constancias
    // no debe pasar sólo por estar dentro del mismo árbol base.
    const comprobante = await storage.save('comprobantes', tramite, Buffer.from('ticket'));
    await expect(storage.leer('constancias', comprobante.ruta)).rejects.toThrow('Ruta de almacenamiento inválida');
  });

  it('propaga el fallo cuando el archivo no existe en disco', async () => {
    await expect(storage.leer('constancias', join(raiz, '2026', tramite.tramiteId, 'constancias', 'no-existe'))).rejects.toThrow();
  });
});

describe('NfsStorage.leerPorUuid', () => {
  it('reconstruye la ruta a partir del trámite dueño y devuelve el contenido', async () => {
    const contenido = Buffer.from('evidencia de prueba');
    const guardado = await storage.save('evidencias', tramite, contenido);

    expect(await storage.leerPorUuid('evidencias', tramite, guardado.archivoUuid)).toEqual(contenido);
  });

  it('rechaza un archivoUuid con formato inválido', async () => {
    await expect(storage.leerPorUuid('evidencias', tramite, 'no-es-un-uuid')).rejects.toThrow('Identificador de archivo inválido');
  });
});

describe('NfsStorage.save', () => {
  it('agrupa distintos scopes de un mismo trámite bajo la misma carpeta año/tramiteId', async () => {
    const evidencia = await storage.save('evidencias', tramite, Buffer.from('a'));
    const comprobante = await storage.save('comprobantes', tramite, Buffer.from('b'));

    const carpetaTramite = join(raiz, '2026', tramite.tramiteId);
    expect(evidencia.ruta.startsWith(join(carpetaTramite, 'evidencias'))).toBe(true);
    expect(comprobante.ruta.startsWith(join(carpetaTramite, 'comprobantes'))).toBe(true);
  });

  it('rechaza un tramiteId con formato inválido', async () => {
    await expect(storage.save('evidencias', { tramiteId: 'no-es-un-uuid', creadoEn: new Date() }, Buffer.from('a'))).rejects.toThrow(
      'Identificador de trámite inválido',
    );
  });

  it('rechaza archivos vacíos', async () => {
    await expect(storage.save('evidencias', tramite, Buffer.alloc(0))).rejects.toThrow('No se permite almacenar archivos vacíos');
  });
});
