import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verificarConstanciaManualDto } from '@gsts/contracts';
import type { Env } from '../../../config/env.js';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { routeParam } from '../../../api/shared/params.js';
import { resolverVerificacion, type ConstanciaVerificable } from './verificacion.js';

// Intento contra un folio que no existe (o cuya credencial no cuadra): no hay
// entidad real que referenciar y bitacora.entidad_id es NOT NULL uuid. Mismo
// recurso que ya usa ConfiguracionPlazos (…0001) para su fila singleton.
const CENTINELA_FOLIO_DESCONOCIDO = '00000000-0000-0000-0000-000000000002';

/**
 * Trae exactamente lo que una respuesta pública puede exponer. rfc, ids
 * internos, nis y hashes quedan fuera desde el `select`, no sólo del DTO —
 * mismo criterio que SELECT_BITACORA. Comparten esto las dos rutas de
 * verificación (por QR y manual): sólo cambia cómo se valida la credencial.
 */
async function buscarConstanciaVerificable(folio: string): Promise<{ id: string; constancia: ConstanciaVerificable } | null> {
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
  if (!fila || !titular) return null;
  return {
    id: fila.id,
    constancia: {
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
    },
  };
}

async function registrarIntento(request: { ip?: string; header(nombre: string): string | undefined }, args: {
  accion: 'VERIFICAR_QR' | 'VERIFICAR_CODIGO';
  folio: string;
  encontrada: { id: string } | null;
  credencialValida: boolean;
  exito: boolean;
}): Promise<void> {
  await prisma.bitacora.create({
    data: {
      origen: 'PORTAL',
      entidad: 'constancia',
      entidadId: args.exito && args.encontrada ? args.encontrada.id : CENTINELA_FOLIO_DESCONOCIDO,
      accion: args.accion,
      ipAddress: request.ip ?? '0.0.0.0',
      userAgent: request.header('user-agent') ?? 'unknown',
      requestId: randomUUID(),
      detalle: { folioIntentado: args.folio, resultado: args.exito ? 'VALIDO' : args.credencialValida ? 'FOLIO_INEXISTENTE' : 'CREDENCIAL_INVALIDA' },
    },
  });
}

export function createPublicoRouter(env: Env): Router {
  const router = Router();
  const verificador = crearVerificadorTokens(env);

  // Cupo propio, además del global de /public: la credencial más corta que se
  // acepta (el código manual) va truncada a 32 bits y la respuesta expone
  // titular y domicilio, así que este limitador es lo que separa una fuerza
  // bruta de una fuga de datos personales. Ambas rutas de verificación lo
  // comparten.
  const limitarVerificacion = rateLimit({
    windowMs: env.VERIFICACION_RATE_LIMIT_WINDOW_MS,
    limit: env.VERIFICACION_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  // Verificación por QR. El token funciona como capacidad: sólo quien tiene el
  // documento impreso puede consultarlo. No existe ruta equivalente sin
  // credencial —el folio es consecutivo y por tanto enumerable.
  router.get('/constancias/:folio/verificar/:token', limitarVerificacion, async (request, response, next) => {
    try {
      const folio = routeParam(request.params.folio, 'folio');
      const credencialValida = verificador.verificarToken(folio, routeParam(request.params.token, 'token'));

      // Se consulta incluso con token inválido para que el tiempo de respuesta
      // no delate qué folios existen.
      const encontrada = await buscarConstanciaVerificable(folio);
      const resultado = resolverVerificacion(encontrada?.constancia ?? null, credencialValida, new Date());

      await registrarIntento(request, { accion: 'VERIFICAR_QR', folio, encontrada, credencialValida, exito: resultado.status === 200 });
      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });

  // Verificación manual: mismo resultado que la de arriba, para cuando el QR
  // no se puede escanear ni fotografiar. `codigo` acepta el token completo o
  // el código corto impreso en texto bajo el QR (verificador.verificarCodigo).
  router.post('/constancias/verificar', limitarVerificacion, async (request, response, next) => {
    try {
      const { folio, codigo } = verificarConstanciaManualDto.parse(request.body);
      const credencialValida = verificador.verificarCodigo(folio, codigo);

      const encontrada = await buscarConstanciaVerificable(folio);
      const resultado = resolverVerificacion(encontrada?.constancia ?? null, credencialValida, new Date());

      await registrarIntento(request, { accion: 'VERIFICAR_CODIGO', folio, encontrada, credencialValida, exito: resultado.status === 200 });
      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });

  return router;
}
