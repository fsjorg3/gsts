import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verificarConstanciaManualDto } from '@gsts/contracts';
import type { Env } from '../../../config/env.js';
import { crearVerificadorTokens } from '../../../infrastructure/verificacion/token.js';
import { routeParam } from '../../../api/shared/params.js';
import { resolverVerificacion } from './verificacion.js';
import { buscarConstanciaVerificable, registrarIntento } from './compartido.js';

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

      await registrarIntento(request, { canal: 'DIRECTO', accion: 'VERIFICAR_QR', folio, encontrada, credencialValida, exito: resultado.status === 200 });
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

      await registrarIntento(request, { canal: 'DIRECTO', accion: 'VERIFICAR_CODIGO', folio, encontrada, credencialValida, exito: resultado.status === 200 });
      response.status(resultado.status).json(resultado.body);
    } catch (error) { next(error); }
  });

  return router;
}
