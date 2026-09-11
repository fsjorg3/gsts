import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { prisma, withBusinessTransaction, type DatabaseContext } from '../../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { AppError } from '../../../shared/errors.js';
import { clasificarFilaPadron, construirDatosPadron, type FilaPadronCsv } from './normalizar.js';

// Sin entidad única a la que atarse (igual que ENTIDAD_ID_EXPORT_TRAMITES en
// tramites.router.ts): bitacora.entidad_id es UUID estricto.
const ENTIDAD_ID_IMPORTAR_PADRON = '00000000-0000-0000-0000-000000000005';

// 500K filas no caben en una sola transacción interactiva sin arriesgar el
// timeout; se procesan en lotes, cada uno en su propia transacción. Esto
// cambia la atomicidad: un lote con una fila inválida revierte solo ese lote,
// los anteriores ya quedaron aplicados. Aceptable porque la operación es
// idempotente (upsert por nis) — corregir la fila y reimportar retoma limpio.
const TAMANO_LOTE = 500;

export interface ResultadoImportacionPadron {
  importados: number;
  reclasificados: number;
  preservados: number;
}

export async function importarExtractoPadron(
  rutaArchivo: string,
  context: DatabaseContext & { ipAddress: string; userAgent: string },
): Promise<ResultadoImportacionPadron> {
  let contenido: string;
  try {
    contenido = readFileSync(rutaArchivo, 'utf8');
  } catch {
    throw new AppError(422, 'FILE_NOT_FOUND', `No se pudo leer el archivo en ${rutaArchivo}`);
  }

  const filas = parse(contenido, { columns: true, skip_empty_lines: true, bom: true }) as FilaPadronCsv[];
  if (filas.length === 0) throw new AppError(422, 'VALIDATION_ERROR', 'El archivo no tiene filas');

  let importados = 0;
  let reclasificados = 0;

  for (let inicio = 0; inicio < filas.length; inicio += TAMANO_LOTE) {
    const lote = filas.slice(inicio, inicio + TAMANO_LOTE);
    await withBusinessTransaction(context, async (tx) => {
      const nisLote = lote.map((fila) => fila.NIS.trim());
      const existentes = await tx.padronOffline.findMany({
        where: { nis: { in: nisLote } },
        select: { nis: true, origen: true },
      });
      const origenPrevio = new Map(existentes.map((fila) => [fila.nis, fila.origen]));

      for (const fila of lote) {
        const nis = fila.NIS.trim();
        if (!nis) throw new AppError(422, 'VALIDATION_ERROR', 'El archivo tiene una fila sin NIS');
        const datos = construirDatosPadron(fila);
        // Siempre IMPORTADO en ambas ramas: un CAPTURADO_MANUAL que este
        // extracto trae de vuelta se reclasifica, que es justo lo que exige
        // el merge (la dirección inversa la bloquea fn_padron_offline_integridad).
        await tx.padronOffline.upsert({ where: { nis }, create: { nis, ...datos }, update: datos });
        if (clasificarFilaPadron(origenPrevio.get(nis)) === 'reclasificado') reclasificados += 1;
        else importados += 1;
      }
    });
  }

  // Lo que quedó sin tocar: CAPTURADO_MANUAL que este extracto no trajo.
  const preservados = await prisma.padronOffline.count({ where: { origen: 'CAPTURADO_MANUAL' } });

  await withBusinessTransaction(context, (tx) =>
    auditarUsuario(tx, context, {
      entidad: 'padron_offline',
      entidadId: ENTIDAD_ID_IMPORTAR_PADRON,
      accion: 'IMPORTAR',
      detalle: { rutaArchivo, importados, reclasificados, preservados, totalFilas: filas.length },
    }),
  );

  return { importados, reclasificados, preservados };
}
