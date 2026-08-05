import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { guardarConfiguracionConstanciaSchema } from '@sicef/contracts';
import { prisma, withBusinessTransaction } from '../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../auditoria/service.js';
import { requireRoles } from '../auth/middleware.js';
import { requestContext } from '../../shared/request-context.js';
import { AppError } from '../../shared/errors.js';

const plazosSchema = z.object({ plazoPagoDias: z.number().int().positive(), plazoSolicitudFacturaDias: z.number().int().positive(), activa: z.boolean().default(true) });

// ConfiguracionPlazos es un singleton con id de texto fijo ('PLAZOS_OPERATIVOS'),
// no UUID como el resto de las entidades. bitacora.entidad_id sí es UUID estricto,
// así que se audita con un UUID "bien conocido" que identifica siempre esta fila.
const PLAZOS_OPERATIVOS_ENTIDAD_ID = '00000000-0000-0000-0000-000000000001';

// Mismo recurso para ConfiguracionConstancia, cuya PK es el enum TipoConstancia
// (tampoco UUID): un UUID bien conocido por tipo. …0002 ya lo usa el centinela
// de folio desconocido en la verificación pública.
const CONSTANCIA_ENTIDAD_ID: Record<'NO_ADEUDO' | 'NO_REGISTRO', string> = {
  NO_ADEUDO: '00000000-0000-0000-0000-000000000003',
  NO_REGISTRO: '00000000-0000-0000-0000-000000000004',
};

const tipoConstanciaParam = z.enum(['NO_ADEUDO', 'NO_REGISTRO']);

function parsearTipo(valor: string | undefined): 'NO_ADEUDO' | 'NO_REGISTRO' {
  const resultado = tipoConstanciaParam.safeParse(valor);
  if (!resultado.success) throw new AppError(404, 'NOT_FOUND', 'Tipo de constancia no encontrado');
  return resultado.data;
}

export function createAdministracionRouter(internal: RequestHandler[]): Router {
  const router = Router(); router.use(...internal, requireRoles('ti'));
  router.get('/plazos', async (request, response, next) => {
    try {
      const data = await prisma.configuracionPlazos.findUnique({ where: { id: 'PLAZOS_OPERATIVOS' } });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.put('/plazos', async (request, response, next) => {
    try {
      const input = plazosSchema.parse(request.body); const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const plazos = await tx.configuracionPlazos.upsert({ where: { id: 'PLAZOS_OPERATIVOS' }, create: { id: 'PLAZOS_OPERATIVOS', ...input, actualizadoPorId: context.actorId }, update: { ...input, actualizadoPorId: context.actorId } });
        await auditarUsuario(tx, context, { entidad: 'configuracion_plazos', entidadId: PLAZOS_OPERATIVOS_ENTIDAD_ID, accion: 'ACTUALIZAR' }); return plazos;
      }); response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  // Vigencia y firmante con los que se genera el PDF de cada tipo de constancia.
  // Devuelve null si nunca se configuró: la UI distingue "sin configurar" de un
  // valor real, y la emisión de ese tipo falla hasta que exista.
  router.get('/constancias/:tipo', async (request, response, next) => {
    try {
      const tipoConstancia = parsearTipo(request.params.tipo);
      const data = await prisma.configuracionConstancia.findUnique({ where: { tipoConstancia } });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.put('/constancias/:tipo', async (request, response, next) => {
    try {
      const tipoConstancia = parsearTipo(request.params.tipo);
      const input = guardarConfiguracionConstanciaSchema.parse(request.body); const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const configuracion = await tx.configuracionConstancia.upsert({ where: { tipoConstancia }, create: { tipoConstancia, ...input, actualizadoPorId: context.actorId }, update: { ...input, actualizadoPorId: context.actorId } });
        await auditarUsuario(tx, context, { entidad: 'configuracion_constancia', entidadId: CONSTANCIA_ENTIDAD_ID[tipoConstancia], accion: 'ACTUALIZAR' }); return configuracion;
      }); response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  return router;
}
