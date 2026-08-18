import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { EstadoTramite, TipoConstancia } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { requireRoles } from '../../auth/middleware.js';
import { AppError } from '../../../shared/errors.js';
import { armarSerieMensual, calcularKpis, type ConteosMetricas } from './metricas.js';

const rangoSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

/** Por omisión, los últimos 12 meses completos hasta hoy. */
function resolverRango(desde?: Date, hasta?: Date): { desde: Date; hasta: Date } {
  const fin = hasta ?? new Date();
  const inicio = desde ?? new Date(Date.UTC(fin.getUTCFullYear() - 1, fin.getUTCMonth(), 1));
  if (inicio > fin) throw new AppError(422, 'VALIDATION_ERROR', 'El inicio del periodo no puede ser posterior al fin');
  return { desde: inicio, hasta: fin };
}

/**
 * Indicadores del tablero de Dirección.
 *
 * SICEF sólo expone lo que puede calcular sobre sus propios datos: constancias,
 * trámites, validaciones y cobros. El éxito de timbrado y las cancelaciones de
 * CFDI son del sistema Finanzas, que los añade al componer el tablero — por eso
 * este endpoint devuelve seis KPIs y no los ocho que muestra la pantalla.
 *
 * Lectura pura: sin transacción de negocio y sin escribir bitácora.
 */
export function createDireccionRouter(internal: RequestHandler[]): Router {
  const router = Router();
  // `direccion` es el rol de la persona; `consulta-metricas` el del service
  // account con el que el backend de Finanzas hace de proxy. Se aceptan ambos.
  router.use(...internal, requireRoles('direccion', 'consulta-metricas'));

  router.get('/metricas', async (request, response, next) => {
    try {
      const rango = rangoSchema.parse(request.query);
      const { desde, hasta } = resolverRango(rango.desde, rango.hasta);
      const periodo = { gte: desde, lte: hasta };

      const [
        constanciasEmitidas,
        porEstadoRaw,
        serieMensualRaw,
        tramitesTotales,
        tramitesAprobados,
        tramitesExpirados,
        tramitesConConsulta,
        revalidacionesTotales,
        revalidacionesFallidas,
        cobrosTotales,
        cobrosConReduccion,
        atencionRaw,
      ] = await Promise.all([
        prisma.constancia.count({ where: { emitidaAt: periodo } }),
        prisma.tramite.groupBy({ by: ['estado'], where: { createdAt: periodo }, _count: { _all: true } }),
        // date_trunc no tiene equivalente en la API de Prisma; la serie mensual
        // es la única agregación que baja a SQL.
        prisma.$queryRaw<Array<{ mes: string; tipo: TipoConstancia; total: bigint }>>`
          SELECT to_char(date_trunc('month', c.emitida_at), 'YYYY-MM') AS mes,
                 t.tipo_constancia AS tipo,
                 count(*) AS total
          FROM constancia c
          JOIN tramite t ON t.id = c.tramite_id
          WHERE c.emitida_at BETWEEN ${desde} AND ${hasta}
          GROUP BY 1, 2
          ORDER BY 1, 2
        `,
        prisma.tramite.count({ where: { createdAt: periodo } }),
        // Alcanzaron APROBADO alguna vez: la bitácora lo sabe aunque el trámite
        // ya haya avanzado o expirado. Es el denominador honesto de «vencidos».
        prisma.bitacora.count({ where: { entidad: 'tramite', estadoNuevo: 'APROBADO', timestamp: periodo } }),
        prisma.tramite.count({ where: { estado: 'EXPIRADO', createdAt: periodo } }),
        prisma.tramite.count({ where: { createdAt: periodo, consultas: { some: {} } } }),
        prisma.validacionNoAdeudo.count({ where: { momento: 'REVALIDACION_COBRO', validadoAt: periodo } }),
        prisma.validacionNoAdeudo.count({ where: { momento: 'REVALIDACION_COBRO', resultado: 'CON_ADEUDO', validadoAt: periodo } }),
        prisma.cobro.count({ where: { cobradoAt: periodo } }),
        prisma.cobro.count({ where: { cobradoAt: periodo, motivoReduccionId: { not: null } } }),
        // Duración de atención: de la creación del trámite al asiento de
        // bitácora que lo dejó en FINALIZADO.
        prisma.$queryRaw<Array<{ suma_ms: number | null; muestras: bigint }>>`
          SELECT COALESCE(sum(EXTRACT(EPOCH FROM (b.timestamp - t.created_at)) * 1000), 0)::double precision AS suma_ms,
                 count(*) AS muestras
          FROM bitacora b
          JOIN tramite t ON t.id = b.entidad_id
          WHERE b.entidad = 'tramite' AND b.estado_nuevo = 'FINALIZADO'
            AND b.timestamp BETWEEN ${desde} AND ${hasta}
        `,
      ]);

      const atencion = atencionRaw[0] ?? { suma_ms: 0, muestras: 0n };
      const conteos: ConteosMetricas = {
        constanciasEmitidas,
        porEstado: porEstadoRaw.map((f) => ({ estado: f.estado, total: f._count._all })),
        serieMensual: serieMensualRaw.map((f) => ({ mes: f.mes, tipo: f.tipo, total: Number(f.total) })),
        tramitesTotales,
        tramitesAprobados,
        tramitesExpirados,
        tramitesConConsulta,
        revalidacionesTotales,
        revalidacionesFallidas,
        cobrosTotales,
        cobrosConReduccion,
        atencionMsAcumulados: Number(atencion.suma_ms ?? 0),
        atencionMuestras: Number(atencion.muestras),
      };

      response.json({
        data: {
          periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
          kpis: calcularKpis(conteos),
          constanciasPorMes: armarSerieMensual(conteos.serieMensual),
          tramitesPorEstado: conteos.porEstado.map((f) => ({ estado: f.estado as EstadoTramite, total: f.total })),
        },
        requestId: request.id,
      });
    } catch (error) { next(error); }
  });

  return router;
}
