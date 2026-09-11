import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { verificarConstanciaManualDto } from '@gsts/contracts';
import type { Env } from '../../../config/env.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { routeParam } from '../../../api/shared/params.js';
import { resolverVerificacion } from './verificacion.js';
import { buscarConstanciaVerificable, registrarIntento } from './compartido.js';

/**
 * Mismas dos verificaciones que `/public`, para el backend del portal
 * institucional: llama servidor a servidor, autenticado contra el SSO (rol de
 * realm `portal-institucional`, ver `router.ts`), nunca el navegador del
 * ciudadano. El HMAC del folio (mismo `crearVerificadorTokens` que `/public`)
 * se conserva como credencial de capacidad: la pantalla del portal que hable
 * con este backend sigue sin pedirle login al ciudadano, así que el token
 * sigue siendo lo único que demuestra que trae el documento en la mano.
 */
export function createVerificacionPortalRouter(env: Env): Router {
  const router = Router();
  const verificador = crearVerificadorTokens(env);

  // Con un único caller autenticado (el backend del portal), limitar por IP no
  // discrimina nada: todo el tráfico legítimo comparte esa IP. Se limita por
  // folio en su lugar — lo que de verdad acota es cuántas veces se puede
  // intentar adivinar la credencial de un folio concreto, sin penalizar el
  // volumen agregado de ciudadanos distintos detrás del portal.
  const limitarPorFolio = rateLimit({
    windowMs: env.VERIFICACION_RATE_LIMIT_WINDOW_MS,
    limit: env.VERIFICACION_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (request: Request) => {
      const folio = request.params.folio ?? (typeof request.body?.folio === 'string' ? request.body.folio : undefined);
      return folio ?? request.ip ?? 'sin-ip';
    },
  });

  router.get('/constancias/:folio/verificar/:token', limitarPorFolio, async (request, response, next) => {
    try {
      const folio = routeParam(request.params.folio, 'folio');
      const credencialValida = verificador.verificarToken(folio, routeParam(request.params.token, 'token'));

      const encontrada = await buscarConstanciaVerificable(folio);
      const resultado = resolverVerificacion(encontrada?.constancia ?? null, credencialValida, new Date());

      await registrarIntento(request, { canal: 'PORTAL_INSTITUCIONAL', accion: 'VERIFICAR_QR', folio, encontrada, credencialValida, exito: resultado.status === 200 });
      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });

  router.post('/constancias/verificar', limitarPorFolio, async (request, response, next) => {
    try {
      const { folio, codigo } = verificarConstanciaManualDto.parse(request.body);
      const credencialValida = verificador.verificarCodigo(folio, codigo);

      const encontrada = await buscarConstanciaVerificable(folio);
      const resultado = resolverVerificacion(encontrada?.constancia ?? null, credencialValida, new Date());

      await registrarIntento(request, { canal: 'PORTAL_INSTITUCIONAL', accion: 'VERIFICAR_CODIGO', folio, encontrada, credencialValida, exito: resultado.status === 200 });
      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });

  return router;
}
