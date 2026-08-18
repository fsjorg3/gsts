import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Env } from '../../../config/env.js';
import { prisma, withBusinessTransaction } from '../../../infrastructure/database/prisma.js';
import { NfsStorage } from '../../../infrastructure/storage/nfs-storage.js';
import { calcularHashContenido } from '../../../infrastructure/verificacion/hash-contenido.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { auditarUsuario } from '../../auditoria/service.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';
import { generarPdfConstancia } from './plantillas/generar.js';
import { PLANTILLAS } from './plantillas/tipos.js';

/** Suma días naturales. La vigencia se cuenta desde la emisión, no desde la aprobación. */
export function sumarDias(desde: Date, dias: number): Date {
  const resultado = new Date(desde);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

// Nota sobre la firma digital: el Servicio de Firma quedó fuera del proyecto
// (tentativamente), así que la emisión NO firma y `firmaDigital`/`certificadoId`
// nacen en null — el modelo ya los declaraba opcionales ("null hasta PKI").
// Ojo: trg_constancia_inmutable cubre esas columnas, de modo que una constancia
// emitida sin firma no puede firmarse después con un UPDATE. La autenticidad se
// sostiene en la firma autógrafa del papel y en la verificación pública por QR.
// El cliente HTTP sigue en infrastructure/signing/ para cuando el servicio vuelva.
export function createConstanciasRouter(storage: NfsStorage, env: Env): Router {
  const router = Router({ mergeParams: true });
  const verificador = crearVerificadorTokens(env);
  // El backend genera el PDF: no recibe archivo. Por eso no hay schema de body.
  router.post('/', async (request, response, next) => {
    let archivo: Awaited<ReturnType<NfsStorage['save']>> | undefined;
    try {
      const context = requestContext(request);
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      // El titular, el tipo y el domicilio alimentan el hash y el cuerpo del documento.
      const tramite = await prisma.tramite.findUniqueOrThrow({
        where: { id: tramiteId },
        select: {
          numeroTramite: true, estado: true, tipoConstancia: true, nis: true,
          domicilioCalle: true, domicilioNumero: true, domicilioColonia: true,
          domicilioPerteneceA: true, domicilioPerteneceANombre: true,
          personas: { where: { rol: 'TITULAR' }, select: { personaId: true, persona: { select: { nombreRazonSocial: true } } }, take: 1 },
        },
      });
      if (tramite.estado !== 'COBRO') throw new AppError(409, 'INVALID_STATE', 'La constancia solo se emite para un tramite cobrado');
      const titular = tramite.personas[0];
      if (!titular) throw new AppError(409, 'INVALID_STATE', 'El tramite no tiene titular registrado');
      // El cuerpo de No Adeudo nombra el número de suministro, y `nis` es
      // opcional en el trámite. Antes que imprimir un hueco en un documento
      // oficial, no se emite — mismo criterio que CONSTANCIA_CONFIG_NOT_SET.
      if (tramite.tipoConstancia === 'NO_ADEUDO' && !tramite.nis?.trim()) {
        throw new AppError(409, 'INVALID_STATE', 'La constancia de no adeudo requiere el numero de suministro (NIS) del tramite');
      }

      // Sin configuración no se emite: la vigencia y el firmante de un documento
      // oficial no deben caer a un valor por defecto que nadie decidió.
      const configuracion = await prisma.configuracionConstancia.findUnique({ where: { tipoConstancia: tramite.tipoConstancia } });
      if (!configuracion) throw new AppError(409, 'CONSTANCIA_CONFIG_NOT_SET', 'No hay configuración de constancia para este tipo: TI debe definir vigencia y firmante en Administración');

      const plantilla = PLANTILLAS[tramite.tipoConstancia];
      if (!plantilla) throw new AppError(409, 'TEMPLATE_NOT_CONFIGURED', 'No existe una plantilla de constancia configurada para este tipo');

      // emitidaAt se fija aquí en vez de dejarlo a @default(now()) de PostgreSQL:
      // el hash se calcula antes del INSERT y necesita exactamente el valor que
      // se guarda. Corregirlo después con un UPDATE chocaría con trg_constancia_inmutable.
      const emitidaAt = new Date(); const vigenciaInicio = emitidaAt;
      const vigenciaFin = sumarDias(emitidaAt, configuracion.vigenciaDias);
      // El folio y el token se resuelven antes de renderizar: el QR impreso los necesita.
      //cambio del numero de oficio Jorge
      const folioUnico = `GSTS-${tramite.numeroTramite}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const versionToken = verificador.versionActual;
      const urlVerificacion = verificador.urlVerificacion(folioUnico, versionToken);
      if (!urlVerificacion) throw new AppError(500, 'INTERNAL_ERROR', 'No se pudo construir la URL de verificación de la constancia');

      const pdf = await generarPdfConstancia(plantilla, {
        folioUnico, emitidaAt, vigenciaFin, vigenciaDias: configuracion.vigenciaDias,
        titular: { nombreRazonSocial: titular.persona.nombreRazonSocial },
        nis: tramite.nis,
        domicilio: {
          calle: tramite.domicilioCalle, numero: tramite.domicilioNumero, colonia: tramite.domicilioColonia,
          perteneceA: tramite.domicilioPerteneceA, perteneceANombre: tramite.domicilioPerteneceANombre,
        },
        firmante: { nombre: configuracion.firmanteNombre, cargo: configuracion.firmanteCargo },
        oficioPrefijo: configuracion.oficioPrefijo,
        urlVerificacion,
      });

      const archivoGuardado = await storage.save('constancias', pdf); archivo = archivoGuardado;
      const data = await withBusinessTransaction(context, async (tx) => {
        const hashContenido = calcularHashContenido({ folioUnico, tipoConstancia: tramite.tipoConstancia, personaTitularId: titular.personaId, emitidaAt, vigenciaInicio, vigenciaFin });
        const constancia = await tx.constancia.create({ data: { tramiteId, folioUnico, archivoUuid: archivoGuardado.archivoUuid, hashPdf: archivoGuardado.hashSha256, hashContenido, versionToken, firmaDigital: null, certificadoId: null, emitidaAt, vigenciaInicio, vigenciaFin } });
        await tx.archivoGenerado.create({ data: { constanciaId: constancia.id, tipo: 'PDF', archivoUuid: archivoGuardado.archivoUuid, ruta: archivoGuardado.ruta, hashSha256: archivoGuardado.hashSha256, mimeType: 'application/pdf', tamanoBytes: archivoGuardado.tamanoBytes } });
        await auditarUsuario(tx, context, { entidad: 'constancia', entidadId: constancia.id, accion: 'EMITIR', estadoNuevo: 'EMITIDA' });
        return constancia;
      });
      response.status(201).json({ data: { ...data, urlVerificacion: verificador.urlVerificacion(data.folioUnico, data.versionToken) }, requestId: request.id });
    } catch (error) { if (archivo) await storage.remove(archivo.ruta).catch(() => undefined); next(error); }
  });

  // Descarga del PDF emitido. Rompe la envolvente { data } a propósito: es una
  // descarga de archivo. Los errores sí conservan el formato { error }.
  router.get('/:constanciaId/archivo', async (request, response, next) => {
    try {
      const tramiteId = routeParam((request.params as { tramiteId?: string }).tramiteId, 'tramiteId');
      const constanciaId = routeParam((request.params as { constanciaId?: string }).constanciaId, 'constanciaId');
      // El filtro por constancia.tramiteId es lo que impide descargar la
      // constancia de otro trámite pasando su id en la ruta.
      const archivoGenerado = await prisma.archivoGenerado.findFirst({
        where: { constanciaId, tipo: 'PDF', conservacion: 'ACTIVO', constancia: { id: constanciaId, tramiteId } },
        select: { ruta: true, mimeType: true, constancia: { select: { folioUnico: true } } },
      });
      if (!archivoGenerado?.constancia) throw new AppError(404, 'NOT_FOUND', 'No se encontró el archivo de la constancia');

      // Los archivos se guardan en NFS con el UUID como nombre, sin extensión:
      // el tipo no puede inferirse de la ruta y se fija explícitamente.
      const contenido = await storage.leer('constancias', archivoGenerado.ruta);
      response.setHeader('content-type', archivoGenerado.mimeType);
      response.setHeader('content-disposition', `attachment; filename="constancia-${archivoGenerado.constancia.folioUnico}.pdf"`);
      response.send(contenido);
    } catch (error) { next(error); }
  });
  return router;
}
