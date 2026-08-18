import { Router, type RequestHandler } from 'express';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { requireRoles } from '../../auth/middleware.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';

/**
 * Única superficie que el sistema Finanzas consume de SICEF.
 *
 * Se llavea por el folio de la constancia, no por la referencia de pago: el
 * folio es `@unique`, va impreso en el documento que el ciudadano se lleva y ya
 * lo usa el QR de verificación. `cobro.referencia_pago` es texto libre, opcional
 * y sin unicidad — sirve como registro interno, nunca como llave de integración.
 *
 * Lectura pura: sin transacción de negocio y sin escribir bitácora.
 */
export function createConsultaCobroRouter(internal: RequestHandler[], storage: NfsStorage): Router {
  const router = Router();
  router.use(...internal, requireRoles('consulta-cobros'));

  // El folio existe sólo cuando la constancia ya fue emitida, así que esta ruta
  // responde 404 antes de eso — coherente con que solicitar factura implica que
  // el pago ya ocurrió.
  router.get('/:folio/cobro', async (request, response, next) => {
    try {
      const folio = routeParam(request.params.folio, 'folio');
      // El `select` es la frontera de privacidad, no el DTO: RFC, nombres, nis e
      // identificadores internos no se leen siquiera de la base. Mismo criterio
      // que la verificación pública por QR y que SELECT_BITACORA.
      const constancia = await prisma.constancia.findUnique({
        where: { folioUnico: folio },
        select: {
          folioUnico: true,
          emitidaAt: true,
          tramite: {
            select: {
              tipoConstancia: true,
              cobro: {
                select: {
                  montoFinal: true,
                  moneda: true,
                  cobradoAt: true,
                  formaPago: true,
                  metodoPago: true,
                  referenciaPago: true,
                  comprobanteNombreOriginal: true,
                  comprobanteMimeType: true,
                  comprobanteTamanoBytes: true,
                  comprobanteHashSha256: true,
                  tarifa: { select: { concepto: true } },
                },
              },
            },
          },
        },
      });

      const cobro = constancia?.tramite.cobro;
      if (!constancia || !cobro) throw new AppError(404, 'NOT_FOUND', 'No se encontró un cobro para ese folio');

      response.json({
        data: {
          folioConstancia: constancia.folioUnico,
          tipoConstancia: constancia.tramite.tipoConstancia,
          emitidaAt: constancia.emitidaAt.toISOString(),
          concepto: cobro.tarifa.concepto,
          montoFinal: cobro.montoFinal.toString(),
          moneda: cobro.moneda,
          cobradoAt: cobro.cobradoAt.toISOString(),
          formaPago: cobro.formaPago,
          metodoPago: cobro.metodoPago,
          referenciaPago: cobro.referenciaPago,
          // El ticket de la terminal (o el comprobante de la transferencia) que
          // se adjuntó al cobrar. Aquí sólo van sus metadatos; los bytes se
          // piden aparte, para que quede registrado cuándo se consulta.
          comprobante: cobro.comprobanteNombreOriginal
            ? {
                nombreOriginal: cobro.comprobanteNombreOriginal,
                mimeType: cobro.comprobanteMimeType,
                tamanoBytes: cobro.comprobanteTamanoBytes,
                hashSha256: cobro.comprobanteHashSha256,
              }
            : null,
        },
        requestId: request.id,
      });
    } catch (error) { next(error); }
  });

  // Descarga del comprobante. Rompe la envolvente { data } a propósito, igual
  // que la descarga del PDF de la constancia; los errores sí conservan { error }.
  router.get('/:folio/cobro/comprobante', async (request, response, next) => {
    try {
      const folio = routeParam(request.params.folio, 'folio');
      const constancia = await prisma.constancia.findUnique({
        where: { folioUnico: folio },
        select: {
          tramite: {
            select: {
              cobro: {
                select: { comprobanteArchivoUuid: true, comprobanteNombreOriginal: true, comprobanteMimeType: true },
              },
            },
          },
        },
      });

      const cobro = constancia?.tramite.cobro;
      if (!cobro?.comprobanteArchivoUuid || !cobro.comprobanteMimeType) {
        throw new AppError(404, 'NOT_FOUND', 'El cobro de ese folio no tiene comprobante adjunto');
      }

      // Los comprobantes se guardan con el UUID como nombre y sin extensión, así
      // que el tipo no puede inferirse de la ruta: se fija explícitamente.
      const contenido = await storage.leerPorUuid('comprobantes', cobro.comprobanteArchivoUuid);
      response.setHeader('content-type', cobro.comprobanteMimeType);
      response.setHeader('content-disposition', `attachment; filename="comprobante-${folio}"`);
      response.send(contenido);
    } catch (error) { next(error); }
  });

  return router;
}
