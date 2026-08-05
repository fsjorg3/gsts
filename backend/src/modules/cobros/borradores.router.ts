import { Router } from 'express';
import { guardarBorradorCobroSchema } from '@sicef/contracts';
import { prisma, withBusinessTransaction } from '../../infrastructure/database/prisma.js';
import { NfsStorage } from '../../infrastructure/storage/nfs-storage.js';
import { auditarUsuario } from '../auditoria/service.js';
import { requestContext } from '../../shared/request-context.js';
import { AppError } from '../../shared/errors.js';
import { routeParam } from '../../api/shared/params.js';
import { resolverMotivoReduccion } from './motivo-reduccion.js';

function tramiteIdDe(request: { params: unknown }): string {
  return routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
}

export function createBorradoresCobroRouter(storage: NfsStorage): Router {
  const router = Router({ mergeParams: true });

  // Cualquier Ventanilla puede consultar los borradores del trámite para retomarlos.
  router.get('/', async (request, response, next) => {
    try {
      const tramiteId = tramiteIdDe(request);
      const data = await prisma.borradorCobro.findMany({ where: { tramiteId }, orderBy: { createdAt: 'desc' } });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  // Crea un borrador ABIERTO. Los montos se derivan de la tarifa al aplicar, no aquí.
  router.post('/', async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = guardarBorradorCobroSchema.parse(request.body);
      const context = requestContext(request);
      const tramiteId = tramiteIdDe(request);
      const abierto = await prisma.borradorCobro.findFirst({ where: { tramiteId, estado: 'ABIERTO' }, select: { id: true } });
      if (abierto) throw new AppError(409, 'DRAFT_ALREADY_OPEN', 'El trámite ya tiene un borrador de cobro abierto');
      if (input.comprobante) archivo = await storage.save('comprobantes', Buffer.from(input.comprobante.base64, 'base64'));
      const data = await withBusinessTransaction(context, async (tx) => {
        const { motivoReduccionId, comprobante, ...resto } = input;
        const motivo = 'motivoReduccionId' in input ? await resolverMotivoReduccion(tx, motivoReduccionId) : {};
        const comprobanteCampos = archivo ? { comprobanteArchivoUuid: archivo.archivoUuid, comprobanteNombreOriginal: comprobante!.nombreOriginal, comprobanteHashSha256: archivo.hashSha256, comprobanteMimeType: comprobante!.mimeType, comprobanteTamanoBytes: archivo.tamanoBytes } : {};
        const borrador = await tx.borradorCobro.create({ data: { ...resto, ...motivo, ...comprobanteCampos, tramiteId, creadoPorId: context.actorId, actualizadoPorId: context.actorId } });
        await auditarUsuario(tx, context, { entidad: 'borrador_cobro', entidadId: borrador.id, accion: 'CREAR_BORRADOR', estadoNuevo: 'ABIERTO' });
        return borrador;
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });

  // Actualiza los datos de pago de un borrador ABIERTO (los campos no enviados no cambian).
  router.patch('/:borradorId', async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const input = guardarBorradorCobroSchema.parse(request.body);
      const context = requestContext(request);
      const borradorId = routeParam(request.params.borradorId, 'borradorId');
      if (input.comprobante) archivo = await storage.save('comprobantes', Buffer.from(input.comprobante.base64, 'base64'));
      const data = await withBusinessTransaction(context, async (tx) => {
        const { motivoReduccionId, comprobante, ...resto } = input;
        const motivo = 'motivoReduccionId' in input ? await resolverMotivoReduccion(tx, motivoReduccionId) : {};
        const comprobanteCampos = archivo ? { comprobanteArchivoUuid: archivo.archivoUuid, comprobanteNombreOriginal: comprobante!.nombreOriginal, comprobanteHashSha256: archivo.hashSha256, comprobanteMimeType: comprobante!.mimeType, comprobanteTamanoBytes: archivo.tamanoBytes } : {};
        const borrador = await tx.borradorCobro.update({ where: { id: borradorId }, data: { ...resto, ...motivo, ...comprobanteCampos, actualizadoPorId: context.actorId } });
        await auditarUsuario(tx, context, { entidad: 'borrador_cobro', entidadId: borrador.id, accion: 'ACTUALIZAR_BORRADOR' });
        return borrador;
      });
      response.json({ data, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });

  // Aplica el borrador: crea el cobro definitivo idéntico, marca APLICADO y pasa el trámite a COBRO.
  router.post('/:borradorId/aplicar', async (request, response, next) => {
    try {
      const context = requestContext(request);
      const tramiteId = tramiteIdDe(request);
      const borradorId = routeParam(request.params.borradorId, 'borradorId');
      const data = await withBusinessTransaction(context, async (tx) => {
        const borrador = await tx.borradorCobro.findUniqueOrThrow({ where: { id: borradorId } });
        if (borrador.estado !== 'ABIERTO') throw new AppError(409, 'DRAFT_NOT_OPEN', 'Sólo un borrador ABIERTO puede aplicarse');
        if (borrador.tramiteId !== tramiteId) throw new AppError(404, 'NOT_FOUND', 'El borrador no pertenece al trámite');
        if (!borrador.tarifaId || !borrador.formaPago || !borrador.metodoPago || borrador.facturaSolicitadaEnVentanilla === null) {
          throw new AppError(422, 'DRAFT_INCOMPLETE', 'El borrador requiere tarifa, forma de pago, método de pago y facturaSolicitadaEnVentanilla antes de aplicarse');
        }
        const tarifa = await tx.tarifa.findUniqueOrThrow({ where: { id: borrador.tarifaId } });
        // Un único origen de valores para garantizar la coincidencia exacta que exige el trigger.
        const montoBase = Number(tarifa.monto);
        const porcentajeReduccion = borrador.porcentajeReduccion === null ? 0 : Number(borrador.porcentajeReduccion);
        const montoFinal = Number((montoBase * (1 - porcentajeReduccion / 100)).toFixed(2));
        const moneda = borrador.moneda ?? 'MXN';
        const pago = {
          tarifaId: tarifa.id, montoBase, motivoReduccionId: borrador.motivoReduccionId, porcentajeReduccion, montoFinal,
          formaPago: borrador.formaPago, metodoPago: borrador.metodoPago, moneda, facturaSolicitadaEnVentanilla: borrador.facturaSolicitadaEnVentanilla, referenciaPago: borrador.referenciaPago,
          // El comprobante ya se subió a NFS al guardar el borrador; aquí solo se copia la referencia, sin tocar NFS de nuevo.
          comprobanteArchivoUuid: borrador.comprobanteArchivoUuid, comprobanteNombreOriginal: borrador.comprobanteNombreOriginal, comprobanteHashSha256: borrador.comprobanteHashSha256, comprobanteMimeType: borrador.comprobanteMimeType, comprobanteTamanoBytes: borrador.comprobanteTamanoBytes,
        };

        const cobro = await tx.cobro.create({ data: { tramiteId, cobradoPorId: context.actorId, ...pago } });
        const borradorAplicado = await tx.borradorCobro.update({ where: { id: borrador.id }, data: { ...pago, estado: 'APLICADO', cobroId: cobro.id, actualizadoPorId: context.actorId } });
        const tramite = await tx.tramite.update({ where: { id: tramiteId }, data: { estado: 'COBRO' } });
        await auditarUsuario(tx, context, { entidad: 'borrador_cobro', entidadId: borrador.id, accion: 'APLICAR', estadoAnterior: 'ABIERTO', estadoNuevo: 'APLICADO', detalle: { cobroId: cobro.id, tramiteEstado: tramite.estado } });
        return { borrador: borradorAplicado, cobro };
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  return router;
}
