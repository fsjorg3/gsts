import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';

export interface StoredFile { archivoUuid: string; ruta: string; hashSha256: string; tamanoBytes: number; }
export type StorageScope = 'evidencias' | 'constancias' | 'comprobantes';

/** Fija la carpeta año/tramiteId para todo el ciclo de vida del trámite: sus
 * evidencias, comprobante y constancia comparten el año de creación del
 * trámite, no el de cada guardado individual. */
export interface TramiteUbicacion { tramiteId: string; creadoEn: Date; }

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export class NfsStorage {
  private readonly basePath: string;
  public constructor(basePath: string) { this.basePath = resolve(basePath); }

  public async save(scope: StorageScope, tramite: TramiteUbicacion, data: Buffer): Promise<StoredFile> {
    if (data.byteLength === 0) throw new Error('No se permite almacenar archivos vacíos');
    const directory = this.directorioTramite(scope, tramite);
    const archivoUuid = randomUUID();
    const ruta = `${directory}${sep}${archivoUuid}`;
    if (basename(ruta) !== archivoUuid || !ruta.startsWith(directory + sep)) throw new Error('Ruta de almacenamiento inválida');
    await mkdir(directory, { recursive: true });
    await writeFile(ruta, data, { flag: 'wx' });
    return { archivoUuid, ruta, hashSha256: createHash('sha256').update(data).digest('hex'), tamanoBytes: data.byteLength };
  }

  /**
   * Lee un archivo ya almacenado. La ruta siempre proviene de la base de
   * datos (archivo_generado.ruta, columna inmutable), nunca de la petición,
   * pero se revalida la contención dentro de basePath de todos modos: mismo
   * criterio defensivo que `save`, para que una ruta corrupta en la base no
   * pueda convertirse en lectura arbitraria de disco.
   *
   * Como los scopes ya no tienen raíz propia (comparten basePath bajo
   * año/tramiteId), aquí también se revalida que el segmento que contiene al
   * archivo coincida con el scope pedido — si no, un comprobante leído
   * pidiendo scope 'constancias' pasaría la validación de contención sin más.
   *
   * Devuelve un Buffer en vez de un stream a propósito: así un archivo
   * faltante falla antes de escribir cabeceras, y el llamador todavía puede
   * responder un status de error en lugar de cortar una respuesta ya iniciada.
   */
  public async leer(scope: StorageScope, ruta: string): Promise<Buffer> {
    const rutaAbsoluta = resolve(ruta);
    if (!rutaAbsoluta.startsWith(this.basePath + sep) || basename(rutaAbsoluta) !== basename(ruta)) {
      throw new Error('Ruta de almacenamiento inválida');
    }
    const segmentos = rutaAbsoluta.slice(this.basePath.length + 1).split(sep);
    if (segmentos.length !== 4 || segmentos[2] !== scope) throw new Error('Ruta de almacenamiento inválida');
    return await readFile(rutaAbsoluta);
  }

  /**
   * Lee un archivo del que sólo se conserva su UUID lógico, sin columna
   * `ruta`. Es el caso de las evidencias y los comprobantes de pago: la
   * ubicación se reconstruye a partir del trámite dueño (año + tramiteId), de
   * modo que un `archivoUuid` corrupto en la base no pueda escaparse del
   * directorio del trámite.
   */
  public async leerPorUuid(scope: StorageScope, tramite: TramiteUbicacion, archivoUuid: string): Promise<Buffer> {
    if (!UUID_RE.test(archivoUuid)) throw new Error('Identificador de archivo inválido');
    const directory = this.directorioTramite(scope, tramite);
    return await this.leer(scope, `${directory}${sep}${archivoUuid}`);
  }

  public async remove(ruta: string): Promise<void> {
    await unlink(ruta).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private directorioTramite(scope: StorageScope, tramite: TramiteUbicacion): string {
    if (!UUID_RE.test(tramite.tramiteId)) throw new Error('Identificador de trámite inválido');
    // UTC, no hora local del servidor: createdAt es timestamptz y el proceso
    // puede correr en cualquier huso horario.
    const anio = tramite.creadoEn.getUTCFullYear();
    const directory = resolve(this.basePath, String(anio), tramite.tramiteId, scope);
    if (!directory.startsWith(this.basePath + sep)) throw new Error('Ruta de almacenamiento inválida');
    return directory;
  }
}
