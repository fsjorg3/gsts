import { Router, type RequestHandler } from 'express';
import type { Env } from '../config/env.js';
import { NfsStorage } from '../infrastructure/storage/nfs-storage.js';
import { createAdministracionRouter } from '../modules/administracion/administracion.router.js';
import { createAuthRouter } from '../modules/auth/auth.router.js';
import { createAuthenticate, requireRoles } from '../modules/auth/middleware.js';
import { bindActor } from '../modules/actores/middleware.js';
import { createBitacoraRouter } from '../modules/bitacora/bitacora.router.js';
import { createCatalogosRouter } from '../modules/catalogos/catalogos.router.js';
import { createBorradoresCobroRouter } from '../modules/cobros/borradores.router.js';
import { createCobrosRouter } from '../modules/cobros/cobros.router.js';
import { createConstanciasRouter } from '../modules/constancias/constancias.router.js';
import { createConsultaCobroRouter } from '../modules/constancias/consulta.router.js';
import { createDireccionRouter } from '../modules/direccion/direccion.router.js';
import { createEvidenciasRouter } from '../modules/evidencias/evidencias.router.js';
import { createMotivosReduccionRouter } from '../modules/motivos-reduccion/motivos-reduccion.router.js';
import { createPersonasRouter } from '../modules/personas/personas.router.js';
import { createPublicoRouter } from '../modules/publico/publico.router.js';
import { createSistemaRouter } from '../modules/sistema/sistema.router.js';
import { createTramitesRouter } from '../modules/tramites/tramites.router.js';
import { createValidacionesRouter } from '../modules/validaciones/validaciones.router.js';

export function createApiRouter(env: Env): Router {
  const router = Router();
  const internal: RequestHandler[] = [createAuthenticate(env), bindActor];
  const storage = new NfsStorage({
    evidencias: env.NFS_EVIDENCIAS_PATH,
    constancias: env.NFS_CONSTANCIAS_PATH,
    comprobantes: env.NFS_COMPROBANTES_PATH,
  });

  router.use(createSistemaRouter());
  router.use('/public', createPublicoRouter(env));
  router.use('/auth', createAuthRouter(internal));
  router.use('/catalogos', createCatalogosRouter(internal));
  router.use('/administracion', createAdministracionRouter(internal));
  router.use('/personas', createPersonasRouter(internal));
  router.use('/motivos-reduccion', createMotivosReduccionRouter(internal));
  router.use('/bitacora', createBitacoraRouter(internal));
  // Superficie de sólo lectura que consume el sistema Finanzas. `/constancias`
  // a nivel raíz no colisiona con `/tramites/:tramiteId/constancias`.
  router.use('/constancias', createConsultaCobroRouter(internal, storage));
  router.use('/direccion', createDireccionRouter(internal));

  // Las rutas especializadas se montan antes de /tramites/:id/:accion y sólo
  // ejecutan autenticación para su propio caso de uso.
  router.use('/tramites/:tramiteId/evidencias', ...internal, requireRoles('ventanilla'), createEvidenciasRouter(storage, env.MAX_EVIDENCIA_TOTAL_BYTES));
  router.use('/tramites/:tramiteId/validaciones/no-adeudo', ...internal, requireRoles('ventanilla'), createValidacionesRouter());
  router.use('/tramites/:tramiteId/borradores-cobro', ...internal, requireRoles('ventanilla'), createBorradoresCobroRouter(storage));
  router.use('/tramites/:tramiteId/cobros', ...internal, requireRoles('ventanilla'), createCobrosRouter(storage));
  router.use('/tramites/:tramiteId/constancias', ...internal, requireRoles('ventanilla'), createConstanciasRouter(storage, env));
  router.use('/tramites', createTramitesRouter(internal, env));
  return router;
}
