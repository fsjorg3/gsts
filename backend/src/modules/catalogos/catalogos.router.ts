import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { crearCatalogoSchema, crearTarifaSchema, paginationSchema } from '@sicef/contracts';
import { prisma, withBusinessTransaction } from '../../infrastructure/database/prisma.js';
import { auditarUsuario } from '../auditoria/service.js';
import { requireRoles } from '../auth/middleware.js';
import { requestContext } from '../../shared/request-context.js';
import { AppError } from '../../shared/errors.js';
import { routeParam } from '../../api/shared/params.js';

const grupoSchema = z.object({
  clave: z.string().trim().min(1).max(80), nombre: z.string().trim().min(1).max(200), orden: z.number().int().min(0),
  aplicaTipo: z.enum(['NO_ADEUDO', 'NO_REGISTRO']).optional(), aplicaPersonalidad: z.enum(['FISICA', 'MORAL']).optional(), aplicaRepresentacion: z.enum(['TITULAR', 'REPRESENTANTE', 'APODERADO']).optional(),
});
const opcionSchema = z.object({ clave: z.string().trim().min(1).max(80), nombre: z.string().trim().min(1).max(200), orden: z.number().int().min(0) });
const documentoSchema = z.object({ nombre: z.string().trim().min(1).max(200), orden: z.number().int().min(0) });

type OpcionValidar = { clave: string; orden: number; documentos: Array<{ orden: number }> };
type GrupoValidar = { clave: string; orden: number; aplicaTipo: string | null; aplicaPersonalidad: string | null; aplicaRepresentacion: string | null; opciones: OpcionValidar[] };
type CatalogoParaValidar = { grupos: GrupoValidar[] };

const TIPOS = ['NO_ADEUDO', 'NO_REGISTRO'] as const;
const PERSONALIDADES = ['FISICA', 'MORAL'] as const;
const REPRESENTACIONES = ['TITULAR', 'REPRESENTANTE', 'APODERADO'] as const;

function hayDuplicados(valores: Array<string | number>): boolean {
  return new Set(valores).size !== valores.length;
}

export function erroresCatalogo(catalogo: CatalogoParaValidar): string[] {
  const errores: string[] = [];
  if (catalogo.grupos.length === 0) errores.push('El catálogo requiere al menos un grupo aplicable.');
  if (hayDuplicados(catalogo.grupos.map((grupo) => grupo.orden))) errores.push('Los grupos tienen valores de orden duplicados.');
  if (hayDuplicados(catalogo.grupos.map((grupo) => grupo.clave))) errores.push('Los grupos tienen claves duplicadas.');
  for (const grupo of catalogo.grupos) {
    if (grupo.opciones.length === 0) errores.push(`El grupo ${grupo.clave} requiere al menos una opción.`);
    if (hayDuplicados(grupo.opciones.map((opcion) => opcion.orden))) errores.push(`El grupo ${grupo.clave} tiene opciones con orden duplicado.`);
    if (hayDuplicados(grupo.opciones.map((opcion) => opcion.clave))) errores.push(`El grupo ${grupo.clave} tiene opciones con clave duplicada.`);
    for (const opcion of grupo.opciones) {
      if (opcion.documentos.length === 0) errores.push(`La opción ${opcion.clave} requiere al menos un documento.`);
      if (hayDuplicados(opcion.documentos.map((documento) => documento.orden))) errores.push(`La opción ${opcion.clave} tiene documentos con orden duplicado.`);
    }
  }
  // Cada combinación tipo×personalidad×representación debe tener una ruta de cumplimiento:
  // ningún grupo aplicable puede quedar sin una opción con documentos.
  for (const tipo of TIPOS) for (const personalidad of PERSONALIDADES) for (const representacion of REPRESENTACIONES) {
    const aplicables = catalogo.grupos.filter((grupo) =>
      (grupo.aplicaTipo === null || grupo.aplicaTipo === tipo) &&
      (grupo.aplicaPersonalidad === null || grupo.aplicaPersonalidad === personalidad) &&
      (grupo.aplicaRepresentacion === null || grupo.aplicaRepresentacion === representacion));
    const incompletos = aplicables.filter((grupo) => grupo.opciones.length === 0 || grupo.opciones.every((opcion) => opcion.documentos.length === 0));
    if (incompletos.length > 0) errores.push(`La combinación ${tipo}/${personalidad}/${representacion} tiene grupos sin ruta de cumplimiento: ${incompletos.map((grupo) => grupo.clave).join(', ')}.`);
  }
  return [...new Set(errores)];
}

export function createCatalogosRouter(internal: RequestHandler[]): Router {
  const router = Router();
  router.use(...internal);

  router.get('/requisitos/activo', async (_request, response, next) => {
    try {
      const data = await prisma.versionCatalogo.findFirst({ where: { activa: true, publicada: true }, include: { grupos: { orderBy: { orden: 'asc' }, include: { opciones: { orderBy: { orden: 'asc' }, include: { documentos: { orderBy: { orden: 'asc' } } } } } } } });
      response.json({ data });
    } catch (error) { next(error); }
  });

  // Lecturas que ventanilla necesita para operar (catálogo estampado y tarifas
  // vigentes) — cualquier actor autenticado; las mutaciones exigen `ti` abajo.
  router.get('/requisitos/:id/vista-previa', async (request, response, next) => {
    try { const data = await prisma.versionCatalogo.findUniqueOrThrow({ where: { id: routeParam(request.params.id, 'id') }, include: { grupos: { orderBy: { orden: 'asc' }, include: { opciones: { orderBy: { orden: 'asc' }, include: { documentos: { orderBy: { orden: 'asc' } } } } } } } }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  router.get('/tarifas/activas', async (request, response, next) => {
    try {
      const { tipo } = z.object({ tipo: z.enum(['NO_ADEUDO', 'NO_REGISTRO']).optional() }).parse(request.query);
      const data = await prisma.tarifa.findMany({ where: { activa: true, publicada: true, ...(tipo ? { tipoConstancia: tipo } : {}) }, orderBy: { concepto: 'asc' } });
      response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });

  router.use(requireRoles('ti'));
  // Lista todas las versiones (publicadas o no) para que TI pueda retomar un
  // borrador abandonado en vez de intentar crear uno nuevo con una versión ya
  // usada (la columna `version` es única).
  router.get('/requisitos', async (request, response, next) => {
    try {
      const { take, cursor } = paginationSchema.parse(request.query);
      const data = await prisma.versionCatalogo.findMany({
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { version: 'desc' },
      });
      const nextCursor = data.length > take ? data.pop()?.id : undefined;
      response.json({ data, meta: { nextCursor }, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.post('/requisitos', async (request, response, next) => {
    try {
      const { clonarDesdeId, ...input } = crearCatalogoSchema.parse(request.body); const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const catalogo = await tx.versionCatalogo.create({ data: { ...input, publicada: false, activa: false } });
        if (clonarDesdeId) {
          const base = await tx.versionCatalogo.findUniqueOrThrow({ where: { id: clonarDesdeId }, include: { grupos: { orderBy: { orden: 'asc' }, include: { opciones: { orderBy: { orden: 'asc' }, include: { documentos: { orderBy: { orden: 'asc' } } } } } } } });
          for (const grupoBase of base.grupos) {
            const grupo = await tx.grupoRequisito.create({ data: { versionCatalogoId: catalogo.id, clave: grupoBase.clave, nombre: grupoBase.nombre, orden: grupoBase.orden, aplicaTipo: grupoBase.aplicaTipo, aplicaPersonalidad: grupoBase.aplicaPersonalidad, aplicaRepresentacion: grupoBase.aplicaRepresentacion } });
            for (const opcionBase of grupoBase.opciones) {
              const opcion = await tx.opcionRequisito.create({ data: { grupoId: grupo.id, clave: opcionBase.clave, nombre: opcionBase.nombre, orden: opcionBase.orden } });
              for (const documentoBase of opcionBase.documentos) await tx.opcionDocumento.create({ data: { opcionId: opcion.id, nombre: documentoBase.nombre, orden: documentoBase.orden } });
            }
          }
        }
        await auditarUsuario(tx, context, { entidad: 'version_catalogo', entidadId: catalogo.id, accion: clonarDesdeId ? 'CLONAR_BORRADOR' : 'CREAR_BORRADOR' }); return catalogo;
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.post('/requisitos/:id/publicar', async (request, response, next) => {
    try {
      const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => {
        const target = await tx.versionCatalogo.findUniqueOrThrow({ where: { id: routeParam(request.params.id, 'id') }, include: { grupos: { include: { opciones: { include: { documentos: { select: { id: true, orden: true } } } } } } } });
        if (target.publicada) throw new AppError(409, 'CATALOG_ALREADY_PUBLISHED', 'El catálogo publicado es inmutable');
        const errores = erroresCatalogo(target); if (errores.length > 0) throw new AppError(422, 'CATALOG_INCOMPLETE', 'El borrador no está listo para publicarse', errores);
        await tx.versionCatalogo.updateMany({ where: { activa: true }, data: { activa: false, vigenteHasta: new Date() } });
        const published = await tx.versionCatalogo.update({ where: { id: target.id }, data: { publicada: true, activa: true, vigenteDesde: target.vigenteDesde ?? new Date() } });
        await auditarUsuario(tx, context, { entidad: 'version_catalogo', entidadId: target.id, accion: 'PUBLICAR_Y_ACTIVAR' }); return published;
      }); response.json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.get('/requisitos/:id/validar', async (request, response, next) => {
    try {
      const catalogo = await prisma.versionCatalogo.findUniqueOrThrow({ where: { id: routeParam(request.params.id, 'id') }, include: { grupos: { orderBy: { orden: 'asc' }, include: { opciones: { orderBy: { orden: 'asc' }, include: { documentos: { orderBy: { orden: 'asc' } } } } } } } });
      const errores = erroresCatalogo(catalogo); response.json({ data: { valid: errores.length === 0, errors: errores }, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.post('/requisitos/:id/grupos', async (request, response, next) => {
    try { const input = grupoSchema.parse(request.body); const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const group = await tx.grupoRequisito.create({ data: { ...input, versionCatalogoId: routeParam(request.params.id, 'id') } }); await auditarUsuario(tx, context, { entidad: 'grupo_requisito', entidadId: group.id, accion: 'AGREGAR_A_BORRADOR' }); return group; }); response.status(201).json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  router.post('/grupos/:id/opciones', async (request, response, next) => {
    try { const input = opcionSchema.parse(request.body); const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const option = await tx.opcionRequisito.create({ data: { ...input, grupoId: routeParam(request.params.id, 'id') } }); await auditarUsuario(tx, context, { entidad: 'opcion_requisito', entidadId: option.id, accion: 'AGREGAR_A_BORRADOR' }); return option; }); response.status(201).json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  router.post('/opciones/:id/documentos', async (request, response, next) => {
    try { const input = documentoSchema.parse(request.body); const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const document = await tx.opcionDocumento.create({ data: { ...input, opcionId: routeParam(request.params.id, 'id') } }); await auditarUsuario(tx, context, { entidad: 'opcion_documento', entidadId: document.id, accion: 'AGREGAR_A_BORRADOR' }); return document; }); response.status(201).json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  router.post('/tarifas', async (request, response, next) => {
    try {
      const { clonarDesdeId, ...input } = crearTarifaSchema.parse(request.body); const context = requestContext(request);
      const data = await withBusinessTransaction(context, async (tx) => {
        const base = clonarDesdeId ? await tx.tarifa.findUniqueOrThrow({ where: { id: clonarDesdeId }, select: { tipoConstancia: true, concepto: true, monto: true } }) : undefined;
        const tipoConstancia = input.tipoConstancia ?? base?.tipoConstancia;
        const concepto = input.concepto ?? base?.concepto;
        const monto = input.monto ?? (base ? Number(base.monto) : undefined);
        if (!tipoConstancia || !concepto || monto === undefined) throw new AppError(422, 'TARIFF_INCOMPLETE', 'Faltan tipo de constancia, concepto o monto para la tarifa');
        const tarifa = await tx.tarifa.create({ data: { tipoConstancia, concepto, monto, version: input.version, vigenteDesde: input.vigenteDesde, vigenteHasta: input.vigenteHasta, publicada: false, activa: false } });
        await auditarUsuario(tx, context, { entidad: 'tarifa', entidadId: tarifa.id, accion: clonarDesdeId ? 'CLONAR_BORRADOR' : 'CREAR_BORRADOR' }); return tarifa;
      });
      response.status(201).json({ data, requestId: request.id });
    } catch (error) { next(error); }
  });
  router.post('/tarifas/:id/publicar', async (request, response, next) => {
    try { const context = requestContext(request); const data = await withBusinessTransaction(context, async (tx) => { const target = await tx.tarifa.findUniqueOrThrow({ where: { id: routeParam(request.params.id, 'id') } }); await tx.tarifa.updateMany({ where: { tipoConstancia: target.tipoConstancia, concepto: target.concepto, activa: true }, data: { activa: false, vigenteHasta: new Date() } }); const published = await tx.tarifa.update({ where: { id: target.id }, data: { publicada: true, activa: true, vigenteDesde: target.vigenteDesde ?? new Date() } }); await auditarUsuario(tx, context, { entidad: 'tarifa', entidadId: target.id, accion: 'PUBLICAR_Y_ACTIVAR' }); return published; }); response.json({ data, requestId: request.id }); } catch (error) { next(error); }
  });
  return router;
}
