import { Router, type RequestHandler } from 'express';
import { importarPadronSchema } from '@gsts/contracts';
import { prisma } from '../../../infrastructure/database/prisma.js';
import { requireRoles } from '../../auth/middleware.js';
import { requestContext } from '../../../shared/request-context.js';
import { AppError } from '../../../shared/errors.js';
import { routeParam } from '../../../api/shared/params.js';
import { resolverNombreSugerido } from './normalizar.js';
import { importarExtractoPadron } from './importar.js';

// Catálogo offline del padrón de usuarios: resuelve nombre y domicilio por
// NIS para No Adeudo mientras la integración real con OUC sigue bloqueada.
// Puerto preparado para sustituirse por esa integración sin tocar el resto
// del sistema — ver backend/src/infrastructure/ouc/.
export function createPadronRouter(internal: RequestHandler[]): Router {
  const router = Router();
  router.use(...internal);

  router.get('/:nis', requireRoles('ventanilla'), async (request, response, next) => {
    try {
      const nis = routeParam(request.params.nis, 'nis');
      const registro = await prisma.padronOffline.findUnique({ where: { nis } });
      if (!registro) throw new AppError(404, 'NOT_FOUND', 'NIS no encontrado en el catálogo offline del padrón');
      response.json({
        data: {
          nis: registro.nis,
          nombreSugerido: resolverNombreSugerido(registro.propietario),
          titularPago: registro.titularPago,
          domicilio: {
            calle: registro.domicilioCalle,
            numero: registro.domicilioNumero,
            colonia: registro.domicilioColonia,
            perteneceA: registro.domicilioPerteneceA,
            perteneceANombre: registro.domicilioPerteneceANombre,
          },
          origen: registro.origen,
        },
        requestId: request.id,
      });
    } catch (error) { next(error); }
  });

  router.post('/importar', requireRoles('ti'), async (request, response, next) => {
    try {
      const { rutaArchivo } = importarPadronSchema.parse(request.body);
      const context = requestContext(request);
      const data = await importarExtractoPadron(rutaArchivo, context);
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  return router;
}
