import { Router, type RequestHandler } from 'express';
import type { Env } from '../config/env.js';
import { NfsStorage } from '../infrastructure/storage/nfs-storage.js';
import { createAdministracionRouter } from '../modules/constancias/administracion/administracion.router.js';
import { createAuthRouter } from '../modules/auth/auth.router.js';
import { createAuthenticate, requireRoles } from '../modules/auth/middleware.js';
import { bindActor } from '../modules/actores/middleware.js';
import { createBitacoraRouter } from '../modules/bitacora/bitacora.router.js';
import { createCatalogosRouter } from '../modules/constancias/catalogos/catalogos.router.js';
import { createBorradoresCobroRouter } from '../modules/constancias/cobros/borradores.router.js';
import { createCobrosRouter } from '../modules/constancias/cobros/cobros.router.js';
import { createConstanciasRouter } from '../modules/constancias/constancias/constancias.router.js';
import { createConsultaCobroRouter } from '../modules/constancias/constancias/consulta.router.js';
import { createDireccionRouter } from '../modules/constancias/direccion/direccion.router.js';
import { createEvidenciasRouter } from '../modules/constancias/evidencias/evidencias.router.js';
import { createMotivosReduccionRouter } from '../modules/constancias/motivos-reduccion/motivos-reduccion.router.js';
import { createPersonasRouter } from '../modules/personas/personas.router.js';
import { createPublicoRouter } from '../modules/constancias/publico/publico.router.js';
import { createSistemaRouter } from '../modules/sistema/sistema.router.js';
import { createTramitesRouter } from '../modules/constancias/tramites/tramites.router.js';
import { createValidacionesNoRegistroRouter } from '../modules/constancias/validaciones/no-registro.router.js';
import { createValidacionesRouter } from '../modules/constancias/validaciones/validaciones.router.js';

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
  router.use('/tramites/:tramiteId/validaciones/no-registro', ...internal, requireRoles('ventanilla'), createValidacionesNoRegistroRouter());
  router.use('/tramites/:tramiteId/borradores-cobro', ...internal, requireRoles('ventanilla'), createBorradoresCobroRouter(storage));
  router.use('/tramites/:tramiteId/cobros', ...internal, requireRoles('ventanilla'), createCobrosRouter(storage));
  router.use('/tramites/:tramiteId/constancias', ...internal, requireRoles('ventanilla'), createConstanciasRouter(storage, env));
  router.use('/tramites', createTramitesRouter(internal, env));
  return router;
}
