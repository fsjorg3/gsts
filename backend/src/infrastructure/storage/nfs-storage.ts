import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';

export interface StoredFile { archivoUuid: string; ruta: string; hashSha256: string; tamanoBytes: number; }
export type StorageScope = 'evidencias' | 'constancias' | 'comprobantes';

export class NfsStorage {
  public constructor(private readonly paths: Record<StorageScope, string>) {}

  public async save(scope: StorageScope, data: Buffer): Promise<StoredFile> {
    if (data.byteLength === 0) throw new Error('No se permite almacenar archivos vacíos');
    const directory = resolve(this.paths[scope]);
    const archivoUuid = randomUUID();
    const ruta = join(directory, archivoUuid);
    if (basename(ruta) !== archivoUuid || !ruta.startsWith(directory)) throw new Error('Ruta de almacenamiento inválida');
    await mkdir(directory, { recursive: true });
    await writeFile(ruta, data, { flag: 'wx' });
    return { archivoUuid, ruta, hashSha256: createHash('sha256').update(data).digest('hex'), tamanoBytes: data.byteLength };
  }

  /**
   * Lee un archivo ya almacenado. La ruta siempre proviene de la base de datos
   * (archivo_generado.ruta, columna inmutable), nunca de la petición, pero se
   * revalida la contención dentro del directorio del scope de todos modos:
   * mismo criterio defensivo que `save`, para que una ruta corrupta en la base
   * no pueda convertirse en lectura arbitraria de disco.
   *
   * Devuelve un Buffer en vez de un stream a propósito: así un archivo faltante
   * falla antes de escribir cabeceras, y el llamador todavía puede responder un
   * status de error en lugar de cortar una respuesta ya iniciada.
   */
  public async leer(scope: StorageScope, ruta: string): Promise<Buffer> {
    const directory = resolve(this.paths[scope]);
    const rutaAbsoluta = resolve(ruta);
    if (!rutaAbsoluta.startsWith(directory + sep) || basename(rutaAbsoluta) !== basename(ruta)) {
      throw new Error('Ruta de almacenamiento inválida');
    }
    return await readFile(rutaAbsoluta);
  }

  /**
   * Lee un archivo del que sólo se conserva su UUID lógico, sin columna `ruta`.
   * Es el caso de los comprobantes de pago: `cobro`/`borrador_cobro` guardan
   * `comprobante_archivo_uuid` pero no la ruta, a diferencia de
   * `archivo_generado`. El UUID se valida como nombre plano antes de componer
   * la ruta, de modo que un valor corrupto en la base no pueda escaparse del
   * directorio del scope.
   */
  public async leerPorUuid(scope: StorageScope, archivoUuid: string): Promise<Buffer> {
    if (!/^[0-9a-fA-F-]{36}$/.test(archivoUuid)) throw new Error('Identificador de archivo inválido');
    return await this.leer(scope, join(resolve(this.paths[scope]), archivoUuid));
  }

  public async remove(ruta: string): Promise<void> {
    await unlink(ruta).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
