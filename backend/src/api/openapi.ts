import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  actualizarEvidenciaSchema,
  actualizarMotivoReduccionSchema,
  crearMotivoReduccionSchema,
  crearPersonaSchema,
  crearTramiteSchema,
  crearCatalogoSchema,
  crearTarifaSchema,
  guardarBorradorCobroSchema,
  paginationSchema,
  tipoConstanciaSchema,
  personalidadSchema,
  representacionSchema,
  metodoValidacionSchema,
  momentoValidacionSchema,
  resultadoValidacionSchema,
  metodoPagoSchema,
  actorMeDto,
  personaDto,
  motivoReduccionDto,
  bitacoraDto,
  versionCatalogoDto,
  versionCatalogoConArbolDto,
  grupoRequestSchema,
  opcionRequestSchema,
  documentoRequestSchema,
  actualizarGrupoSchema,
  actualizarOpcionSchema,
  actualizarDocumentoSchema,
  recursoEliminadoDto,
  grupoRequisitoDto,
  opcionRequisitoDto,
  opcionDocumentoDto,
  catalogoValidacionDto,
  tarifaDto,
  configuracionConstanciaDto,
  configuracionPlazosDto,
  guardarConfiguracionConstanciaSchema,
  tramiteDto,
  tramiteConPersonasDto,
  tramiteDetalleDto,
  evidenciaDto,
  validacionNoAdeudoDto,
  validacionNoRegistroDto,
  validacionRequestSchema,
  validacionNoRegistroRequestSchema,
  borradorCobroDto,
  cobroDto,
  cobroRespuestaDto,
  aplicarBorradorRespuestaDto,
  constanciaDto,
  cobroPorFolioDto,
  metricasDireccionDto,
  verificacionConstanciaPublicaDto,
  verificarConstanciaManualDto,
  errorSchema,
} from '@gsts/contracts';

// ===================== Mirrors de esquemas de request definidos localmente en cada
// router (no exportados de @gsts/contracts). Existen solo para documentar el
// contrato; los routers siguen validando con su propia copia.
//
// Los de catálogo (grupo/opción/documento) dejaron de estar aquí: viven en
// @gsts/contracts junto con sus variantes de actualización, para no mantener
// seis copias a mano. =====================

const evidenciaRequestSchema = z.object({
  opcionDocumentoId: z.string().uuid(),
  nombreOriginal: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  contenidoBase64: z.string().min(1).regex(/^[A-Za-z0-9+/]+={0,2}$/).describe('Contenido del archivo codificado en Base64, en una sola línea: sin saltos de línea ni prefijo data:'),
});
const cobroRequestSchema = z.object({
  tarifaId: z.string().uuid(),
  motivoReduccionId: z.string().uuid().nullable().optional(),
  formaPago: z.string().trim().min(1).max(10),
  metodoPago: metodoPagoSchema,
  moneda: z.literal('MXN').default('MXN'),
  facturaSolicitadaEnVentanilla: z.boolean().default(false).describe('Dato informativo de la ventanilla; la factura vive en el sistema Finanzas'),
  referenciaPago: z.string().trim().min(1).max(255),
  comprobante: z.object({
    base64: z.string().min(1).describe('Comprobante de pago (voucher) codificado en Base64'),
    nombreOriginal: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(100),
  }).describe('Obligatorio: se reenvía a GAF al capturar la solicitud de factura'),
});
const plazosRequestSchema = z.object({
  plazoPagoDias: z.number().int().positive(),
  revalidacionGraciaMinutos: z.number().int().min(0),
  activa: z.boolean().default(true),
});
const transicionTramiteRequestSchema = z.object({ motivo: z.string().trim().min(1).optional() }).describe('Sólo se usa en la acción "rechazar"');

// ===================== Registro de components.schemas =====================

const schemas: Record<string, object> = {};

function def(name: string, schema: z.ZodTypeAny): string {
  schemas[name] = zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as object;
  return name;
}

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

function refNullable(name: string) {
  return { allOf: [ref(name)], nullable: true };
}

// Requests
const CrearPersona = def('CrearPersona', crearPersonaSchema);
const ActualizarEvidencia = def('ActualizarEvidencia', actualizarEvidenciaSchema);
const CrearMotivoReduccion = def('CrearMotivoReduccion', crearMotivoReduccionSchema);
const ActualizarMotivoReduccion = def('ActualizarMotivoReduccion', actualizarMotivoReduccionSchema);
const CrearTramite = def('CrearTramite', crearTramiteSchema);
const CrearCatalogo = def('CrearCatalogo', crearCatalogoSchema);
const CrearTarifa = def('CrearTarifa', crearTarifaSchema);
const GuardarBorradorCobro = def('GuardarBorradorCobro', guardarBorradorCobroSchema);
const GrupoRequest = def('GrupoRequest', grupoRequestSchema);
const OpcionRequest = def('OpcionRequest', opcionRequestSchema);
const DocumentoRequest = def('DocumentoRequest', documentoRequestSchema);
const ActualizarGrupo = def('ActualizarGrupo', actualizarGrupoSchema);
const ActualizarOpcion = def('ActualizarOpcion', actualizarOpcionSchema);
const ActualizarDocumento = def('ActualizarDocumento', actualizarDocumentoSchema);
const RecursoEliminado = def('RecursoEliminado', recursoEliminadoDto);
const EvidenciaRequest = def('EvidenciaRequest', evidenciaRequestSchema);
const ValidacionRequest = def('ValidacionRequest', validacionRequestSchema);
const ValidacionNoRegistroRequest = def('ValidacionNoRegistroRequest', validacionNoRegistroRequestSchema);
const CobroRequest = def('CobroRequest', cobroRequestSchema);
const PlazosRequest = def('PlazosRequest', plazosRequestSchema);
const ConfiguracionConstanciaRequest = def('ConfiguracionConstanciaRequest', guardarConfiguracionConstanciaSchema);
const TransicionTramiteRequest = def('TransicionTramiteRequest', transicionTramiteRequestSchema);
const VerificarConstanciaManual = def('VerificarConstanciaManual', verificarConstanciaManualDto);

// Responses (entidades y compuestos)
const ActorMe = def('ActorMe', actorMeDto);
const Persona = def('Persona', personaDto);
const MotivoReduccion = def('MotivoReduccion', motivoReduccionDto);
const Bitacora = def('Bitacora', bitacoraDto);
const VersionCatalogo = def('VersionCatalogo', versionCatalogoDto);
const VersionCatalogoConArbol = def('VersionCatalogoConArbol', versionCatalogoConArbolDto);
const GrupoRequisito = def('GrupoRequisito', grupoRequisitoDto);
const OpcionRequisito = def('OpcionRequisito', opcionRequisitoDto);
const OpcionDocumento = def('OpcionDocumento', opcionDocumentoDto);
const CatalogoValidacion = def('CatalogoValidacion', catalogoValidacionDto);
const Tarifa = def('Tarifa', tarifaDto);
const ConfiguracionPlazos = def('ConfiguracionPlazos', configuracionPlazosDto);
const ConfiguracionConstancia = def('ConfiguracionConstancia', configuracionConstanciaDto);
const Tramite = def('Tramite', tramiteDto);
const TramiteConPersonas = def('TramiteConPersonas', tramiteConPersonasDto);
const TramiteDetalle = def('TramiteDetalle', tramiteDetalleDto);
const Evidencia = def('Evidencia', evidenciaDto);
const ValidacionNoAdeudo = def('ValidacionNoAdeudo', validacionNoAdeudoDto);
const ValidacionNoRegistro = def('ValidacionNoRegistro', validacionNoRegistroDto);
const BorradorCobro = def('BorradorCobro', borradorCobroDto);
const Cobro = def('Cobro', cobroDto);
const CobroRespuesta = def('CobroRespuesta', cobroRespuestaDto);
const AplicarBorradorRespuesta = def('AplicarBorradorRespuesta', aplicarBorradorRespuestaDto);
const Constancia = def('Constancia', constanciaDto);
const CobroPorFolio = def('CobroPorFolio', cobroPorFolioDto);
const MetricasDireccion = def('MetricasDireccion', metricasDireccionDto);
const VerificacionConstanciaPublica = def('VerificacionConstanciaPublica', verificacionConstanciaPublicaDto);
const Error_ = def('Error', errorSchema);

// ===================== Helpers de path items =====================

const bearer = [{ bearerAuth: [] }];

function body(name: string) {
  return { required: true, content: { 'application/json': { schema: ref(name) } } };
}

function envelope(name: string, opts: { nullable?: boolean; description?: string } = {}) {
  const data = opts.nullable ? refNullable(name) : ref(name);
  return {
    description: opts.description ?? 'OK',
    content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data, requestId: { type: 'string' } } } } },
  };
}

// `total` y `porEstado` sólo los devuelven los listados que alimentan un
// paginador o unas tarjetas; se declaran por ruta y no aquí, para no anunciarlos
// en las que no los traen.
interface MetaExtra {
  total?: boolean;
  porEstado?: boolean;
}

function envelopeLista(name: string, description = 'Listado paginado', extra: MetaExtra = {}) {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['data'],
          properties: {
            data: { type: 'array', items: ref(name) },
            meta: {
              type: 'object',
              properties: {
                nextCursor: { type: 'string', format: 'uuid' },
                ...(extra.total ? { total: { type: 'integer', description: 'Registros que cumplen el filtro, en todas las páginas' } } : {}),
                ...(extra.porEstado
                  ? {
                      porEstado: {
                        type: 'object',
                        description: 'Conteo por estado sobre el filtro aplicado **sin** el filtro `estado`; todos los estados presentes, los vacíos en 0',
                        additionalProperties: { type: 'integer' },
                      },
                    }
                  : {}),
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
    },
  };
}

function errorResponse(description: string) {
  return { description, content: { 'application/json': { schema: ref(Error_) } } };
}

const ERRORES_AUTENTICACION = { '401': errorResponse('No autenticado'), '403': errorResponse('Sin permisos suficientes') };
const ERRORES_VALIDACION = { '422': errorResponse('Entrada inválida') };
const ERRORES_NO_ENCONTRADO = { '404': errorResponse('No encontrado') };
const ERRORES_CATALOGO_PUBLICADO = { '409': errorResponse('CATALOG_ALREADY_PUBLISHED: el catálogo publicado es inmutable') };
const PARAM_ID_CATALOGO = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } } as const;

const PARAM_TIPO_CONSTANCIA = { name: 'tipo', in: 'path', required: true, schema: { type: 'string', enum: ['NO_ADEUDO', 'NO_REGISTRO'] } };

export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'GSTS API', version: 'v1', description: 'API de GSTS (Gerencia de Supervisión Técnica de los Servicios) — hoy sólo el dominio de Constancias. La facturación (CFDI) vive en el sistema Finanzas, independiente de éste. Ver documentacion/CONTRATO_API_GSTS.md para máquinas de estado y reglas de negocio.' },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
  },
  paths: {
    // ---------- Sistema ----------
    '/health': { get: { tags: ['Sistema'], summary: 'Estado del proceso', responses: { '200': { description: 'Disponible', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { status: { const: 'ok' } } } } } } } } } } },
    '/ready': { get: { tags: ['Sistema'], summary: 'Disponibilidad de dependencias (base de datos)', responses: { '200': { description: 'Listo', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { status: { const: 'ready' } } } } } } } }, '500': errorResponse('La base de datos no respondió') } } },
    '/openapi.json': { get: { tags: ['Sistema'], summary: 'Contrato OpenAPI', responses: { '200': { description: 'Este documento' } } } },

    // ---------- Rutas públicas (sin autenticación, con rate limit) ----------
    // La solicitud y la consulta de CFDI se trasladaron al sistema Finanzas.
    '/public/constancias/{folio}/verificar/{token}': {
      get: {
        tags: ['Público'],
        summary: 'Verificar una constancia por folio y token del QR',
        description: 'Servicio de consulta de SOAPAP sobre su propio registro: confirma que el folio existe, que lo emitió SOAPAP, a nombre de quién y en qué estado de vigencia está. No sustituye la firma autógrafa del documento ni pretende valor probatorio autónomo. El token va impreso en el QR de la constancia; sin él no hay forma de consultar un folio, para impedir la enumeración. Token inválido y folio inexistente devuelven un 404 idéntico.',
        parameters: [
          { name: 'folio', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'token', in: 'path', required: true, schema: { type: 'string', pattern: '^v\\d+\\.[0-9a-f]+$' } },
        ],
        responses: { '200': envelope(VerificacionConstanciaPublica, { description: 'Constancia encontrada y token válido (incluye vencidas y anuladas)' }), '404': errorResponse('Folio inexistente o token inválido — indistinguibles a propósito'), '429': errorResponse('Límite de tasa excedido') },
      },
    },
    '/public/constancias/verificar': {
      post: {
        tags: ['Público'],
        summary: 'Verificar una constancia sin escanear el QR (folio + código)',
        description: 'Misma verificación que la ruta por QR, para cuando éste no se puede escanear ni fotografiar. `codigo` acepta el token completo del QR o el código corto impreso en texto bajo él (mismo HMAC, recortado). Folio inexistente y código inválido devuelven un 404 idéntico, por la misma razón que en la ruta por QR.',
        requestBody: body(VerificarConstanciaManual),
        responses: { '200': envelope(VerificacionConstanciaPublica, { description: 'Constancia encontrada y código válido (incluye vencidas y anuladas)' }), '404': errorResponse('Folio inexistente o código inválido — indistinguibles a propósito'), '422': errorResponse('Falta folio o código'), '429': errorResponse('Límite de tasa excedido') },
      },
    },

    // ---------- Auth ----------
    '/auth/me': { get: { tags: ['Auth'], security: bearer, summary: 'Contexto del actor autenticado', responses: { '200': envelope(ActorMe), ...ERRORES_AUTENTICACION } } },

    // ---------- Catálogos y asistente de administración (rol ti para mutaciones) ----------
    '/catalogos/requisitos/activo': { get: { tags: ['Catálogos'], security: bearer, summary: 'Obtener el catálogo de requisitos activo', responses: { '200': envelope(VersionCatalogoConArbol, { nullable: true, description: 'Catálogo activo, o null si ninguno está publicado' }), ...ERRORES_AUTENTICACION } } },
    '/catalogos/requisitos': {
      get: {
        tags: ['Catálogos'], security: bearer, summary: 'Listar todas las versiones de catálogo, publicadas o no (rol ti)',
        parameters: [
          { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'cursor', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': envelopeLista(VersionCatalogo, 'Versiones de catálogo, más reciente primero'), ...ERRORES_AUTENTICACION },
      },
      post: { tags: ['Catálogos'], security: bearer, summary: 'Crear borrador de catálogo (opcionalmente clonando otra versión vía clonarDesdeId)', requestBody: body(CrearCatalogo), responses: { '201': envelope(VersionCatalogo, { description: 'Borrador creado' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } },
    },
    '/catalogos/requisitos/{id}': {
      delete: { tags: ['Catálogos'], security: bearer, summary: 'Descartar un borrador de catálogo completo (rol ti; sólo si no está publicado)', parameters: [PARAM_ID_CATALOGO], responses: { '200': envelope(RecursoEliminado, { description: 'Borrador descartado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO } },
    },
    '/catalogos/requisitos/{id}/validar': { get: { tags: ['Catálogos'], security: bearer, summary: 'Validar borrador de catálogo (claves/orden duplicados, cobertura de combinaciones)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': envelope(CatalogoValidacion), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO } } },
    '/catalogos/requisitos/{id}/vista-previa': { get: { tags: ['Catálogos'], security: bearer, summary: 'Obtener vista previa del catálogo (árbol completo)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': envelope(VersionCatalogoConArbol), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO } } },
    '/catalogos/requisitos/{id}/publicar': { post: { tags: ['Catálogos'], security: bearer, summary: 'Publicar y activar catálogo validado (desactiva la versión anterior)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': envelope(VersionCatalogo, { description: 'Catálogo publicado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, '409': errorResponse('El catálogo ya estaba publicado'), ...ERRORES_VALIDACION } } },
    '/catalogos/requisitos/{id}/grupos': { post: { tags: ['Catálogos'], security: bearer, summary: 'Agregar grupo al borrador', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(GrupoRequest), responses: { '201': envelope(GrupoRequisito, { description: 'Grupo agregado' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } } },
    '/catalogos/grupos/{id}/opciones': { post: { tags: ['Catálogos'], security: bearer, summary: 'Agregar opción a un grupo', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(OpcionRequest), responses: { '201': envelope(OpcionRequisito, { description: 'Opción agregada' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } } },
    '/catalogos/opciones/{id}/documentos': { post: { tags: ['Catálogos'], security: bearer, summary: 'Agregar documento a una opción', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(DocumentoRequest), responses: { '201': envelope(OpcionDocumento, { description: 'Documento agregado' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } } },
    '/catalogos/grupos/{id}': {
      patch: { tags: ['Catálogos'], security: bearer, summary: 'Editar un grupo del borrador (rol ti; null en aplica* quita el filtro)', parameters: [PARAM_ID_CATALOGO], requestBody: body(ActualizarGrupo), responses: { '200': envelope(GrupoRequisito, { description: 'Grupo actualizado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO, ...ERRORES_VALIDACION } },
      delete: { tags: ['Catálogos'], security: bearer, summary: 'Quitar un grupo del borrador con sus opciones y documentos (rol ti)', parameters: [PARAM_ID_CATALOGO], responses: { '200': envelope(RecursoEliminado, { description: 'Grupo eliminado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO } },
    },
    '/catalogos/opciones/{id}': {
      patch: { tags: ['Catálogos'], security: bearer, summary: 'Editar una opción del borrador (rol ti)', parameters: [PARAM_ID_CATALOGO], requestBody: body(ActualizarOpcion), responses: { '200': envelope(OpcionRequisito, { description: 'Opción actualizada' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO, ...ERRORES_VALIDACION } },
      delete: { tags: ['Catálogos'], security: bearer, summary: 'Quitar una opción del borrador con sus documentos (rol ti)', parameters: [PARAM_ID_CATALOGO], responses: { '200': envelope(RecursoEliminado, { description: 'Opción eliminada' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO } },
    },
    '/catalogos/documentos/{id}': {
      patch: { tags: ['Catálogos'], security: bearer, summary: 'Editar un documento del borrador (rol ti)', parameters: [PARAM_ID_CATALOGO], requestBody: body(ActualizarDocumento), responses: { '200': envelope(OpcionDocumento, { description: 'Documento actualizado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO, ...ERRORES_VALIDACION } },
      delete: { tags: ['Catálogos'], security: bearer, summary: 'Quitar un documento del borrador (rol ti)', parameters: [PARAM_ID_CATALOGO], responses: { '200': envelope(RecursoEliminado, { description: 'Documento eliminado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_CATALOGO_PUBLICADO } },
    },
    '/catalogos/tarifas/activas': { get: { tags: ['Catálogos'], security: bearer, summary: 'Listar tarifas publicadas y activas (opcionalmente por tipo de constancia)', parameters: [{ name: 'tipo', in: 'query', schema: { type: 'string', enum: ['NO_ADEUDO', 'NO_REGISTRO'] } }], responses: { '200': envelopeLista(Tarifa, 'Tarifas vigentes'), ...ERRORES_AUTENTICACION } } },
    '/catalogos/tarifas': { post: { tags: ['Catálogos'], security: bearer, summary: 'Crear borrador de tarifa (opcionalmente clonando otra vía clonarDesdeId)', requestBody: body(CrearTarifa), responses: { '201': envelope(Tarifa, { description: 'Borrador creado' }), ...ERRORES_AUTENTICACION, '422': errorResponse('Entrada inválida o faltan tipo/concepto/monto sin clonarDesdeId') } } },
    '/catalogos/tarifas/{id}/publicar': { post: { tags: ['Catálogos'], security: bearer, summary: 'Publicar y activar tarifa (desactiva la anterior del mismo tipo+concepto)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': envelope(Tarifa, { description: 'Tarifa publicada' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO } } },
    '/administracion/plazos': {
      get: { tags: ['Administración'], security: bearer, summary: 'Obtener la configuración de plazos operativos vigente (rol ti)', responses: { '200': envelope(ConfiguracionPlazos, { nullable: true, description: 'Configuración vigente, o null si nunca se ha guardado' }), ...ERRORES_AUTENTICACION } },
      put: { tags: ['Administración'], security: bearer, summary: 'Configurar plazos operativos (rol ti)', requestBody: body(PlazosRequest), responses: { '200': envelope(ConfiguracionPlazos, { description: 'Plazos actualizados' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } },
    },
    '/administracion/constancias/{tipo}': {
      get: { tags: ['Administración'], security: bearer, summary: 'Obtener vigencia y firmante con los que se genera la constancia de un tipo (rol ti)', parameters: [PARAM_TIPO_CONSTANCIA], responses: { '200': envelope(ConfiguracionConstancia, { nullable: true, description: 'Configuración del tipo, o null si nunca se ha guardado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO } },
      put: { tags: ['Administración'], security: bearer, summary: 'Configurar vigencia y firmante de un tipo de constancia (rol ti)', parameters: [PARAM_TIPO_CONSTANCIA], requestBody: body(ConfiguracionConstanciaRequest), responses: { '200': envelope(ConfiguracionConstancia, { description: 'Configuración actualizada' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_VALIDACION } },
    },

    // ---------- Personas ----------
    '/personas': {
      get: {
        tags: ['Personas'], security: bearer, summary: 'Buscar personas por nombre o RFC (paginación por cursor)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 200 } },
          { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'cursor', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': envelopeLista(Persona, 'Personas encontradas'), ...ERRORES_AUTENTICACION },
      },
      post: {
        tags: ['Personas'], security: bearer, summary: 'Crear persona (rol ventanilla)',
        requestBody: body(CrearPersona),
        responses: { '201': envelope(Persona, { description: 'Persona creada' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION },
      },
    },

    // ---------- Motivos de reducción (catálogo simple, rol ti para mutaciones) ----------
    '/motivos-reduccion': {
      get: {
        tags: ['Motivos de reducción'], security: bearer, summary: 'Listar motivos de reducción (opcionalmente filtrado por activo)',
        parameters: [{ name: 'activo', in: 'query', schema: { type: 'boolean' } }],
        responses: { '200': envelopeLista(MotivoReduccion, 'Motivos de reducción'), ...ERRORES_AUTENTICACION },
      },
      post: {
        tags: ['Motivos de reducción'], security: bearer, summary: 'Crear motivo de reducción (rol ti)',
        requestBody: body(CrearMotivoReduccion),
        responses: { '201': envelope(MotivoReduccion, { description: 'Motivo creado' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION },
      },
    },
    '/motivos-reduccion/{id}': {
      patch: {
        tags: ['Motivos de reducción'], security: bearer, summary: 'Editar o activar/desactivar un motivo de reducción (rol ti)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: body(ActualizarMotivoReduccion),
        responses: { '200': envelope(MotivoReduccion, { description: 'Motivo actualizado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_VALIDACION },
      },
    },

    // ---------- Bitácora (auditoría global, rol ti) ----------
    '/bitacora': {
      get: {
        tags: ['Bitácora'], security: bearer, summary: 'Listar entradas de auditoría (rol ti; ip_address/user_agent nunca se exponen)',
        parameters: [
          { name: 'entidad', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 80 } },
          { name: 'entidadId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'accion', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 80 } },
          { name: 'actorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'cursor', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': envelopeLista(Bitacora, 'Entradas de bitácora, más reciente primero', { total: true }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION },
      },
    },

    // ---------- Trámites y expediente ----------
    '/tramites': {
      get: {
        tags: ['Trámites'], security: bearer, summary: 'Listar trámites (filtros opcionales; paginación por cursor)',
        description: '`folio` es excluyente: cuando viene, el resto de los filtros se ignora. Acepta el folio completo (`NA-2026-02038`) o por segmentos (`NA-2026`, `NA`, `02038`); si trae número, el segmento de año no se aplica porque `numeroTramite` ya es único. `meta.porEstado` se calcula sobre el filtro aplicado **sin** `estado`.',
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['CAPTURA', 'EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'COBRO', 'FINALIZADO'] } },
          { name: 'tipoConstancia', in: 'query', schema: { type: 'string', enum: ['NO_ADEUDO', 'NO_REGISTRO'] } },
          { name: 'nis', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 60 } },
          { name: 'folio', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 20 } },
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'cursor', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': envelopeLista(Tramite, 'Listado paginado', { total: true, porEstado: true }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION },
      },
      post: { tags: ['Trámites'], security: bearer, summary: 'Crear trámite (requiere catálogo activo publicado; rol ventanilla)', requestBody: body(CrearTramite), responses: { '201': envelope(TramiteConPersonas, { description: 'Trámite creado en CAPTURA' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION, '409': errorResponse('No existe un catálogo activo para crear el trámite') } },
    },
    '/tramites/export': {
      get: {
        tags: ['Trámites'], security: bearer,
        summary: 'Exportar trámites a XLSX (rol jefatura, client role exclusivo)',
        description: 'Mismos filtros que `GET /tramites` (`folio` sigue siendo excluyente), sin `take`/`cursor`: exporta todo lo que cumpla el filtro, hasta 10 000 registros. Rompe la envolvente `{ data }` — es una descarga, no `{ data }`. Es la única descarga que audita en bitácora (`accion: EXPORTAR`, con los filtros usados y el total de filas): a diferencia de un archivo puntual (evidencia, PDF de constancia), es una extracción masiva de datos personales.',
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['CAPTURA', 'EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'COBRO', 'FINALIZADO'] } },
          { name: 'tipoConstancia', in: 'query', schema: { type: 'string', enum: ['NO_ADEUDO', 'NO_REGISTRO'] } },
          { name: 'nis', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 60 } },
          { name: 'folio', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 20 } },
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': {
            description: 'Libro de Excel con una fila por trámite',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
          },
          ...ERRORES_AUTENTICACION,
          ...ERRORES_VALIDACION,
          '409': errorResponse('EXPORT_TOO_LARGE: el filtro reúne más trámites que el máximo exportable'),
        },
      },
    },
    '/tramites/{id}': { get: { tags: ['Trámites'], security: bearer, summary: 'Obtener expediente completo del trámite', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': envelope(TramiteDetalle), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO } } },
    '/tramites/{id}/{accion}': {
      post: {
        tags: ['Trámites'], security: bearer, summary: 'Transicionar el estado del trámite (rol ventanilla)',
        description: 'Valores válidos de `accion`: iniciar-validacion (→EN_VALIDACION), aprobar (→APROBADO), rechazar (→RECHAZADO), expirar (→EXPIRADO), finalizar (→FINALIZADO). Las condiciones de guardia de cada transición las impone la base de datos — ver CONTRATO_API_GSTS.md.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'accion', in: 'path', required: true, schema: { type: 'string', enum: ['iniciar-validacion', 'aprobar', 'rechazar', 'expirar', 'finalizar'] } },
        ],
        requestBody: { required: false, content: { 'application/json': { schema: ref(TransicionTramiteRequest) } } },
        responses: { '200': envelope(Tramite, { description: 'Trámite actualizado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, '409': errorResponse('Transición no permitida por el estado actual o las reglas de negocio') },
      },
    },
    '/tramites/{id}/evidencias': { post: { tags: ['Trámites'], security: bearer, summary: 'Guardar evidencia en NFS (Base64; rol ventanilla)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(EvidenciaRequest), responses: { '201': envelope(Evidencia, { description: 'Evidencia registrada' }), ...ERRORES_AUTENTICACION, '422': errorResponse('Entrada inválida o evidencia excede el límite acumulado de 30 MiB') } } },
    '/tramites/{id}/evidencias/{evidenciaId}': { patch: { tags: ['Trámites'], security: bearer, summary: 'Validar o rechazar una evidencia cargada (rol ventanilla)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'evidenciaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(ActualizarEvidencia), responses: { '200': envelope(Evidencia, { description: 'Evidencia resuelta' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, ...ERRORES_VALIDACION } } },
    '/tramites/{id}/evidencias/{evidenciaId}/archivo': {
      get: {
        tags: ['Trámites'], security: bearer,
        summary: 'Descargar el archivo de una evidencia cargada (roles ventanilla o direccion)',
        description: 'Devuelve el archivo binario tal como se cargó, no la envolvente `{ data }` — es una descarga. Los errores sí conservan el formato `{ error }`.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'evidenciaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Contenido de la evidencia', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
          ...ERRORES_AUTENTICACION,
          ...ERRORES_NO_ENCONTRADO,
        },
      },
    },
    '/tramites/{id}/validaciones/no-adeudo': { post: { tags: ['Trámites'], security: bearer, summary: 'Registrar el cruce con el OUC de un trámite de No Adeudo (rol ventanilla). Exige evidenciaOuc (foto/captura de la consulta, Base64). Upsert por momento: repetirlo corrige el resultado y reemplaza la evidencia. Aprobar exige VALIDACION_INICIAL con SIN_ADEUDO; cobrar exige REVALIDACION_COBRO con SIN_ADEUDO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(ValidacionRequest), responses: { '200': envelope(ValidacionNoAdeudo, { description: 'Validación registrada' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } } },
    '/tramites/{id}/validaciones/no-adeudo/archivo': {
      get: {
        tags: ['Trámites'], security: bearer,
        summary: 'Descargar la evidencia OUC de una validación de No Adeudo (roles ventanilla o direccion)',
        description: 'Devuelve el archivo binario tal como se cargó, no la envolvente `{ data }` — es una descarga. Los errores sí conservan el formato `{ error }`.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'momento', in: 'query', required: true, schema: { type: 'string', enum: ['VALIDACION_INICIAL', 'REVALIDACION_COBRO'] } },
        ],
        responses: {
          '200': { description: 'Contenido de la evidencia', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
          ...ERRORES_AUTENTICACION,
          ...ERRORES_NO_ENCONTRADO,
        },
      },
    },
    '/tramites/{id}/validaciones/no-registro': { post: { tags: ['Trámites'], security: bearer, summary: 'Registrar la consulta al padrón de un trámite de No Registro (rol ventanilla). Exige evidenciaOuc (foto/captura de la consulta, Base64). Upsert por momento; repetirlo reemplaza la evidencia. Aprobar exige VALIDACION_INICIAL con SIN_REGISTRO; cobrar exige REVALIDACION_COBRO con SIN_REGISTRO. Registrar CON_REGISTRO es válido y deja el trámite bloqueado a propósito', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(ValidacionNoRegistroRequest), responses: { '200': envelope(ValidacionNoRegistro, { description: 'Validación registrada' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION } } },
    '/tramites/{id}/validaciones/no-registro/archivo': {
      get: {
        tags: ['Trámites'], security: bearer,
        summary: 'Descargar la evidencia OUC de una validación de No Registro (roles ventanilla o direccion)',
        description: 'Devuelve el archivo binario tal como se cargó, no la envolvente `{ data }` — es una descarga. Los errores sí conservan el formato `{ error }`.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'momento', in: 'query', required: true, schema: { type: 'string', enum: ['VALIDACION_INICIAL', 'REVALIDACION_COBRO'] } },
        ],
        responses: {
          '200': { description: 'Contenido de la evidencia', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
          ...ERRORES_AUTENTICACION,
          ...ERRORES_NO_ENCONTRADO,
        },
      },
    },

    // ---------- Borradores de cobro ----------
    '/tramites/{id}/borradores-cobro': {
      get: { tags: ['Borradores de cobro'], security: bearer, summary: 'Listar borradores de cobro del trámite', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': envelopeLista(BorradorCobro, 'Borradores del trámite'), ...ERRORES_AUTENTICACION } },
      post: { tags: ['Borradores de cobro'], security: bearer, summary: 'Crear borrador de cobro ABIERTO (uno por trámite; rol ventanilla)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(GuardarBorradorCobro), responses: { '201': envelope(BorradorCobro, { description: 'Borrador creado' }), ...ERRORES_AUTENTICACION, '409': errorResponse('El trámite ya tiene un borrador de cobro abierto') } },
    },
    '/tramites/{id}/borradores-cobro/{borradorId}': { patch: { tags: ['Borradores de cobro'], security: bearer, summary: 'Actualizar datos de pago de un borrador ABIERTO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'borradorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(GuardarBorradorCobro), responses: { '200': envelope(BorradorCobro, { description: 'Borrador actualizado' }), ...ERRORES_AUTENTICACION, '409': errorResponse('El borrador ya no está ABIERTO') } } },
    '/tramites/{id}/borradores-cobro/{borradorId}/aplicar': { post: { tags: ['Borradores de cobro'], security: bearer, summary: 'Aplicar borrador: crea el cobro definitivo y pasa el trámite a COBRO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'borradorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '201': envelope(AplicarBorradorRespuesta, { description: 'Cobro aplicado' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO, '409': errorResponse('El borrador no está ABIERTO'), '422': errorResponse('Faltan datos de pago en el borrador') } } },

    // ---------- Cobro directo y emisión ----------
    '/tramites/{id}/cobros': { post: { tags: ['Cobros y constancias'], security: bearer, summary: 'Crear cobro directo (sin borrador) y pasar el trámite a COBRO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: body(CobroRequest), responses: { '201': envelope(CobroRespuesta, { description: 'Cobro registrado' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION, '409': errorResponse('El trámite no está APROBADO vigente o no hay tarifa activa compatible') } } },
    '/tramites/{id}/cobros/comprobante': {
      get: {
        tags: ['Cobros y constancias'], security: bearer,
        summary: 'Descargar el comprobante de pago adjuntado al cobrar (rol ventanilla)',
        description: 'Devuelve el archivo binario tal como se adjuntó, no la envolvente `{ data }` — es una descarga. Los errores sí conservan el formato `{ error }`.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Contenido del comprobante', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
          ...ERRORES_AUTENTICACION,
          ...ERRORES_NO_ENCONTRADO,
        },
      },
    },
    '/tramites/{id}/constancias/{constanciaId}/archivo': {
      get: {
        tags: ['Cobros y constancias'], security: bearer, summary: 'Descargar el PDF de la constancia emitida (rol ventanilla)',
        description: 'Devuelve el archivo binario tal como se firmó, no la envolvente `{ data }` — es una descarga. Los errores sí conservan el formato `{ error }`. El `Content-Disposition` sugiere `constancia-{folioUnico}.pdf`.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'constanciaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'PDF de la constancia', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
          ...ERRORES_AUTENTICACION,
          ...ERRORES_NO_ENCONTRADO,
        },
      },
    },
    '/tramites/{id}/constancias': { post: { tags: ['Cobros y constancias'], security: bearer, summary: 'Generar, firmar y emitir constancia (sólo para trámite en COBRO)', description: 'Sin cuerpo: el backend genera el PDF a partir de la plantilla del tipo de constancia, con el QR de verificación estampado, y toma la vigencia y el firmante de la configuración de Administración. Requiere que exista configuración y plantilla para ese tipo.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '201': envelope(Constancia, { description: 'Constancia emitida' }), ...ERRORES_AUTENTICACION, '409': errorResponse('El trámite no está en COBRO, o falta configuración (CONSTANCIA_CONFIG_NOT_SET) o plantilla (TEMPLATE_NOT_CONFIGURED) para ese tipo') } } },

    // ---------- Superficie de sólo lectura hacia el sistema Finanzas ----------
    // Consumida por su service account (roles `consulta-cobros` y
    // `consulta-metricas`), nunca por un navegador ni por roles de personas.
    '/constancias/{folio}/cobro': {
      get: {
        tags: ['Integración Finanzas'], security: bearer,
        summary: 'Consultar el cobro de una constancia por su folio (rol consulta-cobros)',
        description: 'Se llavea por el folio de la constancia porque es único, va impreso en el documento que el ciudadano se lleva y ya lo usa el QR de verificación. `cobro.referenciaPago` es texto libre y sin unicidad: no sirve como llave. La respuesta no incluye datos personales. Responde 404 mientras la constancia no se haya emitido.',
        parameters: [{ name: 'folio', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': envelope(CobroPorFolio, { description: 'Datos del cobro asociado al folio' }), ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO },
      },
    },
    '/constancias/{folio}/cobro/comprobante': {
      get: {
        tags: ['Integración Finanzas'], security: bearer,
        summary: 'Descargar el comprobante de pago adjuntado al cobrar (rol consulta-cobros)',
        description: 'El ticket de la terminal bancaria o el comprobante de la transferencia, tal como se adjuntó en ventanilla. Va en su propia ruta —y no incrustado en el JSON— para que quede claro cuándo se solicita el documento y no sólo sus metadatos. Devuelve los bytes con su content-type, sin la envolvente { data }.',
        parameters: [{ name: 'folio', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Contenido del comprobante', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, ...ERRORES_AUTENTICACION, ...ERRORES_NO_ENCONTRADO },
      },
    },
    '/direccion/metricas': {
      get: {
        tags: ['Integración Finanzas'], security: bearer,
        summary: 'Indicadores del tablero de Dirección (roles direccion o consulta-metricas)',
        description: 'Devuelve los seis KPIs que SICEF puede calcular sobre sus propios datos, más la serie mensual de constancias por tipo y la distribución de trámites por estado. El éxito de timbrado y las cancelaciones de CFDI no están aquí: son del sistema Finanzas, que los agrega al componer el tablero. Sin parámetros, el periodo son los últimos 12 meses.',
        parameters: [
          { name: 'desde', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          { name: 'hasta', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { '200': envelope(MetricasDireccion, { description: 'Indicadores del periodo' }), ...ERRORES_AUTENTICACION, ...ERRORES_VALIDACION },
      },
    },
  },
} as const;
