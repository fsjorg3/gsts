import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Env } from '../../../config/env.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';
import { resolverVerificacion, type ConstanciaVerificable } from './verificacion.js';

// Intento contra un folio que no existe (o cuyo token no cuadra): no hay
// entidad real que referenciar y bitacora.entidad_id es NOT NULL uuid. Mismo
// recurso que ya usa ConfiguracionPlazos (…0001) para su fila singleton.
const CENTINELA_FOLIO_DESCONOCIDO = '00000000-0000-0000-0000-000000000002';

export function createPublicoRouter(env: Env): Router {
  const router = Router();
  const verificador = crearVerificadorTokens(env);

  // Cupo propio, además del global de /public: el token va truncado a 80 bits y
  // la respuesta expone titular y domicilio, así que este limitador es lo que
  // separa una fuerza bruta de una fuga de datos personales.
  const limitarVerificacion = rateLimit({
    windowMs: env.VERIFICACION_RATE_LIMIT_WINDOW_MS,
    limit: env.VERIFICACION_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  // Verificación por QR. El token funciona como capacidad: sólo quien tiene el
  // documento impreso puede consultarlo. No existe ruta equivalente sin token
  // —sería enumerable, porque el folio lleva el consecutivo del trámite.
  router.get('/constancias/:folio/verificar/:token', limitarVerificacion, async (request, response, next) => {
    try {
      const folio = routeParam(request.params.folio, 'folio');
      const tokenValido = verificador.verificarToken(folio, routeParam(request.params.token, 'token'));

      // Se consulta incluso con token inválido para que el tiempo de respuesta
      // no delate qué folios existen. El select trae sólo lo que puede salir:
      // rfc, ids internos, nis y hashes quedan fuera desde la consulta, no sólo
      // del DTO — mismo criterio que SELECT_BITACORA.
      const fila = await prisma.constancia.findUnique({
        where: { folioUnico: folio },
        select: {
          id: true,
          folioUnico: true,
          vigenciaFin: true,
          anulada: true,
          tramite: {
            select: {
              tipoConstancia: true,
              domicilioCalle: true,
              domicilioNumero: true,
              domicilioColonia: true,
              domicilioPerteneceA: true,
              domicilioPerteneceANombre: true,
              // Sólo el titular: representante, apoderado y receptor fiscal
              // nunca se exponen en una ruta pública.
              personas: { where: { rol: 'TITULAR' }, select: { persona: { select: { nombreRazonSocial: true } } }, take: 1 },
            },
          },
        },
      });

      const titular = fila?.tramite.personas[0]?.persona.nombreRazonSocial;
      const constancia: ConstanciaVerificable | null = fila && titular
        ? {
            folioUnico: fila.folioUnico,
            vigenciaFin: fila.vigenciaFin,
            anulada: fila.anulada,
            tipoConstancia: fila.tramite.tipoConstancia,
            titularNombreRazonSocial: titular,
            domicilio: {
              calle: fila.tramite.domicilioCalle,
              numero: fila.tramite.domicilioNumero,
              colonia: fila.tramite.domicilioColonia,
              perteneceA: fila.tramite.domicilioPerteneceA,
              perteneceANombre: fila.tramite.domicilioPerteneceANombre,
            },
          }
        : null;

      const resultado = resolverVerificacion(constancia, tokenValido, new Date());

      await prisma.bitacora.create({
        data: {
          origen: 'PORTAL',
          entidad: 'constancia',
          entidadId: resultado.status === 200 && fila ? fila.id : CENTINELA_FOLIO_DESCONOCIDO,
          accion: 'VERIFICAR_QR',
          ipAddress: request.ip ?? '0.0.0.0',
          userAgent: request.header('user-agent') ?? 'unknown',
          requestId: randomUUID(),
          detalle: { folioIntentado: folio, resultado: resultado.status === 200 ? 'VALIDO' : tokenValido ? 'FOLIO_INEXISTENTE' : 'TOKEN_INVALIDO' },
        },
      });

      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });
  return router;
}
