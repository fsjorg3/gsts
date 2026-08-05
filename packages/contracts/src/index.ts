import { z } from 'zod';

export const rolesSicef = ['ventanilla', 'finanzas', 'ti', 'direccion'] as const;
export const roleSicefSchema = z.enum(rolesSicef);
export type RoleSicef = z.infer<typeof roleSicefSchema>;

// Origen literal de cada rol en el token de Keycloak. `ventanilla` y `finanzas`
// sólo son válidos desde `resource_access.sicef.roles`; `ti` y `direccion` sólo
// desde `realm_access.roles`. Un rol colocado en la fuente equivocada se ignora.
export const rolesCliente = ['ventanilla', 'finanzas'] as const satisfies readonly RoleSicef[];
export const rolesRealm = ['ti', 'direccion'] as const satisfies readonly RoleSicef[];

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

// Alta de persona desde ventanilla. El RFC es opcional en captura (igual que
// en el trámite); la unicidad no se impone: una persona puede repetirse y
// reutilizarse vía búsqueda.
export const crearPersonaSchema = z.object({
  tipo: z.enum(['FISICA', 'MORAL']),
  nombreRazonSocial: z.string().trim().min(1).max(254),
  rfc: z.string().trim().min(12).max(13).optional(),
});

export const buscarPersonasSchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
});

// Resolución de una evidencia cargada: ventanilla la valida (o rechaza) tras
// cotejarla. `CAPTURA → EN_VALIDACION` exige todas las del checklist en VALIDADO.
export const actualizarEvidenciaSchema = z.object({
  estado: z.enum(['VALIDADO', 'RECHAZADO']),
});

export const crearTramiteSchema = z.object({
  tipoConstancia: z.enum(['NO_ADEUDO', 'NO_REGISTRO']),
  personalidad: z.enum(['FISICA', 'MORAL']),
  representacion: z.enum(['TITULAR', 'REPRESENTANTE', 'APODERADO']),
  nis: z.string().trim().min(1).max(100).optional(),
  // Domicilio del predio (solo No Registro): va impreso en la constancia. Sin
  // catálogo de juntas auxiliares/municipios (la zona de cobertura abarca
  // Puebla y 4 municipios más); domicilioPerteneceANombre es texto libre.
  domicilioCalle: z.string().trim().min(1).max(200).optional(),
  domicilioNumero: z.string().trim().min(1).max(50).optional(),
  domicilioColonia: z.string().trim().min(1).max(200).optional(),
  domicilioPerteneceA: z.enum(['JUNTA_AUXILIAR', 'MUNICIPIO']).optional(),
  domicilioPerteneceANombre: z.string().trim().min(1).max(200).optional(),
  personas: z.array(z.object({
    personaId: z.string().uuid(),
    rol: z.enum(['TITULAR', 'REPRESENTANTE', 'APODERADO', 'RECEPTOR_FISCAL']),
  })).min(1),
});

export const crearCatalogoSchema = z.object({
  version: z.number().int().positive(),
  vigenteDesde: z.coerce.date().optional(),
  vigenteHasta: z.coerce.date().optional(),
  // Si se indica, el nuevo borrador clona el árbol de grupos/opciones/documentos
  // de esa versión previa como base editable.
  clonarDesdeId: z.string().uuid().optional(),
});

export const crearTarifaSchema = z.object({
  // tipoConstancia/concepto/monto son opcionales sólo cuando se clona (se heredan
  // de la tarifa base); obligatorios al crear desde cero (ver superRefine).
  tipoConstancia: z.enum(['NO_ADEUDO', 'NO_REGISTRO']).optional(),
  concepto: z.string().trim().min(1).max(200).optional(),
  monto: z.coerce.number().positive().optional(),
  version: z.number().int().positive(),
  vigenteDesde: z.coerce.date().optional(),
  vigenteHasta: z.coerce.date().optional(),
  // Si se indica, hereda concepto/monto/tipo de esa tarifa previa como base.
  clonarDesdeId: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  if (value.clonarDesdeId) return;
  for (const campo of ['tipoConstancia', 'concepto', 'monto'] as const) {
    if (value[campo] === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: 'Requerido cuando no se clona una tarifa base' });
  }
});

// Campos de pago de un borrador de cobro. Todos opcionales: un borrador ABIERTO
// puede guardarse parcialmente y completarse antes de aplicarlo. Los montos
// (montoBase/montoFinal) no se capturan: se derivan de la tarifa al aplicar.
// El porcentaje de reducción tampoco se captura directamente: se elige un
// motivoReduccionId del catálogo (o se omite = sin reducción) y el backend
// deriva y congela el porcentaje desde ahí, nunca confía en un número enviado
// por el cliente.
export const guardarBorradorCobroSchema = z.object({
  tarifaId: z.string().uuid().optional(),
  motivoReduccionId: z.string().uuid().nullable().optional(),
  formaPago: z.string().trim().min(1).max(10).optional(),
  metodoPago: z.enum(['PUE', 'PPD']).optional(),
  requiereFactura: z.boolean().optional(),
  referenciaPago: z.string().trim().min(1).max(255).optional(),
  // Comprobante de pago (voucher). Grupo anidado opcional: o llega completo
  // (archivo nuevo) o no llega, sin estados intermedios inválidos.
  comprobante: z.object({
    base64: z.string().min(1),
    nombreOriginal: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(100),
  }).optional(),
});

// Catálogo simple de motivos de reducción (gestionado por ti). El porcentaje
// se congela en cobro/borrador_cobro al aplicarse: editar o desactivar un
// motivo nunca altera cobros históricos.
export const crearMotivoReduccionSchema = z.object({
  clave: z.string().trim().min(1).max(80),
  nombre: z.string().trim().min(1).max(200),
  porcentaje: z.coerce.number().positive().max(100),
});

export const actualizarMotivoReduccionSchema = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  porcentaje: z.coerce.number().positive().max(100).optional(),
  activo: z.boolean().optional(),
});

// Parámetros con los que el backend genera el PDF de la constancia (rol ti).
// Hay una fila por tipo de constancia; sin ella no se emite ese tipo.
export const guardarConfiguracionConstanciaSchema = z.object({
  vigenciaDias: z.number().int().positive().max(3650),
  firmanteNombre: z.string().trim().min(1).max(200),
  firmanteCargo: z.string().trim().min(1).max(200),
  // Se compone con el año de emisión como `{oficioPrefijo}/{año}`, sin
  // consecutivo: el identificador único del documento sigue siendo el folio.
  oficioPrefijo: z.string().trim().min(1).max(60),
});

// Filtros del visor de bitácora (rol ti). ip_address/user_agent nunca se
// exponen: no forman parte de este schema ni de bitacoraDto más abajo.
export const listarBitacoraSchema = paginationSchema.extend({
  entidad: z.string().trim().min(1).max(80).optional(),
  entidadId: z.string().uuid().optional(),
  accion: z.string().trim().min(1).max(80).optional(),
  actorId: z.string().uuid().optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
});

export const solicitudFacturaPublicaSchema = z.object({
  folio: z.string().trim().min(1).max(100),
  receptorRfc: z.string().trim().min(12).max(13),
  receptorNombre: z.string().trim().min(1).max(254),
  receptorCp: z.string().regex(/^\d{5}$/),
  receptorRegimen: z.string().trim().min(1).max(10),
  usoCfdi: z.string().trim().min(1).max(10),
});

// ===================== ENUMS DE ENTIDAD (para DTOs de respuesta) =====================
// Espejo de los enums de backend/prisma/schema.prisma. Los request schemas de arriba
// no se tocan (siguen con sus z.enum([...]) inline); estos se usan solo en los DTOs
// de abajo y en la conversión a JSON Schema para OpenAPI.

export const tipoConstanciaSchema = z.enum(['NO_ADEUDO', 'NO_REGISTRO']);
export const personalidadSchema = z.enum(['FISICA', 'MORAL']);
export const representacionSchema = z.enum(['TITULAR', 'REPRESENTANTE', 'APODERADO']);
export const rolPersonaSchema = z.enum(['TITULAR', 'REPRESENTANTE', 'APODERADO', 'RECEPTOR_FISCAL']);
export const estadoTramiteSchema = z.enum(['CAPTURA', 'EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'COBRO', 'FINALIZADO']);
export const estadoFacturaSchema = z.enum(['PENDIENTE', 'TIMBRADO_EN_PROCESO', 'TIMBRADO', 'TIMBRADO_FALLIDO', 'CANCELADO']);
export const estadoBorradorCobroSchema = z.enum(['ABIERTO', 'APLICADO', 'VENCIDO', 'CANCELADO']);
export const estadoSolicitudFacturaSchema = z.enum(['PENDIENTE_REVISION', 'ACEPTADA', 'RECHAZADA']);
export const estadoEvidenciaSchema = z.enum(['CARGADO', 'VALIDADO', 'RECHAZADO']);
export const metodoValidacionSchema = z.enum(['MANUAL', 'API']);
export const momentoValidacionSchema = z.enum(['VALIDACION_INICIAL', 'REVALIDACION_COBRO']);
export const resultadoValidacionSchema = z.enum(['SIN_ADEUDO', 'CON_ADEUDO']);
export const tipoConfirmacionSchema = z.enum(['SIN_ADEUDO_OUC', 'FIRMAS_LEGIBLES', 'FACULTADES_PODER']);
export const metodoPagoSchema = z.enum(['PUE', 'PPD']);
export const perteneceASchema = z.enum(['JUNTA_AUXILIAR', 'MUNICIPIO']);
// Estado de una constancia que existe y cuyo token de verificación es válido.
// No incluye NO_ENCONTRADA: folio inexistente y token inválido responden 404
// con el mismo cuerpo, para no permitir enumeración de folios.
export const estadoVerificacionConstanciaSchema = z.enum(['ANULADA', 'VIGENTE', 'VENCIDA']);

// Filtros del listado de trámites (Ventanilla). nis usa coincidencia parcial
// (contains/insensitive); desde/hasta acotan createdAt.
export const listarTramitesSchema = paginationSchema.extend({
  estado: estadoTramiteSchema.optional(),
  tipoConstancia: tipoConstanciaSchema.optional(),
  nis: z.string().trim().min(1).max(60).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
});

// ===================== DTOs DE RESPUESTA =====================
// Describen el formato de alambre (JSON) de lo que la API realmente devuelve, no el
// tipo interno de Prisma: DateTime -> string ISO 8601, Decimal -> string (Prisma
// serializa Decimal.toJSON() como string), UUID -> string. Son documentativos para
// generar tipos de frontend y el contrato OpenAPI; el backend no valida sus
// respuestas con ellos en runtime.

export const personaDto = z.object({
  id: z.string().uuid(),
  tipo: personalidadSchema,
  nombreRazonSocial: z.string(),
  rfc: z.string().nullable(),
  createdAt: z.string(),
});

export const tramitePersonaDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  personaId: z.string().uuid(),
  rol: rolPersonaSchema,
  createdAt: z.string(),
});

export const tramitePersonaConPersonaDto = tramitePersonaDto.extend({ persona: personaDto });

export const opcionDocumentoDto = z.object({
  id: z.string().uuid(),
  opcionId: z.string().uuid(),
  nombre: z.string(),
  orden: z.number().int(),
});

export const opcionRequisitoDto = z.object({
  id: z.string().uuid(),
  grupoId: z.string().uuid(),
  clave: z.string(),
  nombre: z.string(),
  orden: z.number().int(),
});
export const opcionRequisitoConDocumentosDto = opcionRequisitoDto.extend({ documentos: z.array(opcionDocumentoDto) });

export const grupoRequisitoDto = z.object({
  id: z.string().uuid(),
  versionCatalogoId: z.string().uuid(),
  clave: z.string(),
  nombre: z.string(),
  orden: z.number().int(),
  aplicaTipo: tipoConstanciaSchema.nullable(),
  aplicaPersonalidad: personalidadSchema.nullable(),
  aplicaRepresentacion: representacionSchema.nullable(),
});
export const grupoRequisitoConArbolDto = grupoRequisitoDto.extend({ opciones: z.array(opcionRequisitoConDocumentosDto) });

export const versionCatalogoDto = z.object({
  id: z.string().uuid(),
  version: z.number().int(),
  publicada: z.boolean(),
  activa: z.boolean(),
  vigenteDesde: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  createdAt: z.string(),
});
export const versionCatalogoConArbolDto = versionCatalogoDto.extend({ grupos: z.array(grupoRequisitoConArbolDto) });

export const catalogoValidacionDto = z.object({ valid: z.boolean(), errors: z.array(z.string()) });

export const tarifaDto = z.object({
  id: z.string().uuid(),
  tipoConstancia: tipoConstanciaSchema,
  concepto: z.string(),
  monto: z.string(),
  version: z.number().int(),
  publicada: z.boolean(),
  activa: z.boolean(),
  vigenteDesde: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  createdAt: z.string(),
});

export const motivoReduccionDto = z.object({
  id: z.string().uuid(),
  clave: z.string(),
  nombre: z.string(),
  porcentaje: z.string(),
  activo: z.boolean(),
  createdAt: z.string(),
});

export const bitacoraDto = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  actorId: z.string().uuid().nullable(),
  origen: z.enum(['USUARIO', 'SISTEMA', 'WORKER', 'PORTAL']),
  entidad: z.string(),
  entidadId: z.string().uuid(),
  accion: z.string(),
  estadoAnterior: z.string().nullable(),
  estadoNuevo: z.string().nullable(),
  datosAntes: z.unknown().nullable(),
  datosDespues: z.unknown().nullable(),
  detalle: z.unknown().nullable(),
  requestId: z.string().uuid().nullable(),
  correccionDeId: z.string().uuid().nullable(),
});

export const configuracionPlazosDto = z.object({
  id: z.literal('PLAZOS_OPERATIVOS'),
  plazoPagoDias: z.number().int(),
  plazoSolicitudFacturaDias: z.number().int(),
  activa: z.boolean(),
  actualizadoPorId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const configuracionConstanciaDto = z.object({
  tipoConstancia: tipoConstanciaSchema,
  vigenciaDias: z.number().int(),
  firmanteNombre: z.string(),
  firmanteCargo: z.string(),
  oficioPrefijo: z.string(),
  actualizadoPorId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const evidenciaDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  opcionDocumentoId: z.string().uuid(),
  archivoUuid: z.string().uuid(),
  nombreOriginal: z.string(),
  hashSha256: z.string(),
  mimeType: z.string(),
  tamanoBytes: z.number().int(),
  estado: estadoEvidenciaSchema,
  creadoPorId: z.string().uuid(),
  createdAt: z.string(),
});

export const validacionNoAdeudoDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  metodo: metodoValidacionSchema,
  momento: momentoValidacionSchema,
  resultado: resultadoValidacionSchema,
  adeudoMonto: z.string().nullable(),
  referenciaOuc: z.string().nullable(),
  validadoPorId: z.string().uuid().nullable(),
  validadoAt: z.string(),
});

export const confirmacionManualDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  tipo: tipoConfirmacionSchema,
  observacion: z.string().nullable(),
  confirmadoPorId: z.string().uuid(),
  confirmadoAt: z.string(),
});

export const borradorCobroDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  tarifaId: z.string().uuid().nullable(),
  montoBase: z.string().nullable(),
  motivoReduccionId: z.string().uuid().nullable(),
  porcentajeReduccion: z.string().nullable(),
  montoFinal: z.string().nullable(),
  formaPago: z.string().nullable(),
  metodoPago: metodoPagoSchema.nullable(),
  moneda: z.string().nullable(),
  requiereFactura: z.boolean().nullable(),
  referenciaPago: z.string().nullable(),
  comprobanteArchivoUuid: z.string().uuid().nullable(),
  comprobanteNombreOriginal: z.string().nullable(),
  comprobanteHashSha256: z.string().nullable(),
  comprobanteMimeType: z.string().nullable(),
  comprobanteTamanoBytes: z.number().int().nullable(),
  estado: estadoBorradorCobroSchema,
  creadoPorId: z.string().uuid(),
  actualizadoPorId: z.string().uuid(),
  cobroId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  aplicadoAt: z.string().nullable(),
  vencidoAt: z.string().nullable(),
  canceladoAt: z.string().nullable(),
});

export const cobroDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  tarifaId: z.string().uuid(),
  montoBase: z.string(),
  motivoReduccionId: z.string().uuid().nullable(),
  porcentajeReduccion: z.string(),
  montoFinal: z.string(),
  formaPago: z.string(),
  metodoPago: metodoPagoSchema,
  moneda: z.string(),
  requiereFactura: z.boolean(),
  referenciaPago: z.string().nullable(),
  comprobanteArchivoUuid: z.string().uuid().nullable(),
  comprobanteNombreOriginal: z.string().nullable(),
  comprobanteHashSha256: z.string().nullable(),
  comprobanteMimeType: z.string().nullable(),
  comprobanteTamanoBytes: z.number().int().nullable(),
  cobradoPorId: z.string().uuid(),
  cobradoAt: z.string(),
});

export const constanciaDto = z.object({
  id: z.string().uuid(),
  tramiteId: z.string().uuid(),
  folioUnico: z.string(),
  hashPdf: z.string(),
  // SHA-256 sobre los datos estructurados de la constancia, no sobre los bytes
  // del PDF (ése es hashPdf): el mismo contenido puede renderizarse a bytes
  // distintos. Ancla de integridad del registro, independiente del archivo.
  hashContenido: z.string(),
  versionToken: z.string(),
  archivoUuid: z.string().uuid(),
  firmaDigital: z.string().nullable(),
  certificadoId: z.string().nullable(),
  emitidaAt: z.string(),
  vigenciaInicio: z.string(),
  vigenciaFin: z.string(),
  anulada: z.boolean(),
  // Derivado, no columna: URL que codifica el QR impreso en la constancia.
  // null si la versión de clave con la que se emitió ya fue retirada.
  urlVerificacion: z.string().nullable(),
});

export const facturaDto = z.object({
  id: z.string().uuid(),
  cobroId: z.string().uuid(),
  estado: estadoFacturaSchema,
  receptorRfc: z.string().nullable(),
  receptorNombre: z.string().nullable(),
  receptorCp: z.string().nullable(),
  receptorRegimen: z.string().nullable(),
  usoCfdi: z.string().nullable(),
  idempotencyKey: z.string(),
  uuid: z.string().nullable(),
  xmlRuta: z.string().nullable(),
  pdfRuta: z.string().nullable(),
  intentos: z.number().int(),
  ultimoError: z.string().nullable(),
  timbradaAt: z.string().nullable(),
  canceladaAt: z.string().nullable(),
  motivoCancelacion: z.string().nullable(),
  uuidSustituto: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const solicitudFacturaDto = z.object({
  id: z.string().uuid(),
  cobroId: z.string().uuid(),
  facturaId: z.string().uuid().nullable(),
  estado: estadoSolicitudFacturaSchema,
  receptorRfc: z.string(),
  receptorNombre: z.string(),
  receptorCp: z.string(),
  receptorRegimen: z.string(),
  usoCfdi: z.string(),
  fechaLimite: z.string(),
  solicitadaAt: z.string(),
  resueltaPorId: z.string().uuid().nullable(),
  resueltaAt: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
});

export const tramiteDto = z.object({
  id: z.string().uuid(),
  numeroTramite: z.number().int(),
  tipoConstancia: tipoConstanciaSchema,
  personalidad: personalidadSchema,
  representacion: representacionSchema,
  nis: z.string().nullable(),
  domicilioCalle: z.string().nullable(),
  domicilioNumero: z.string().nullable(),
  domicilioColonia: z.string().nullable(),
  domicilioPerteneceA: perteneceASchema.nullable(),
  domicilioPerteneceANombre: z.string().nullable(),
  versionCatalogoId: z.string().uuid(),
  estado: estadoTramiteSchema,
  plazoPagoHasta: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
  creadoPorId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const tramiteConPersonasDto = tramiteDto.extend({ personas: z.array(tramitePersonaDto) });
export const tramiteDetalleDto = tramiteDto.extend({
  personas: z.array(tramitePersonaConPersonaDto),
  evidencias: z.array(evidenciaDto),
  validaciones: z.array(validacionNoAdeudoDto),
  confirmaciones: z.array(confirmacionManualDto),
  cobro: cobroDto.nullable(),
  constancia: constanciaDto.nullable(),
});

// ===================== DTOs de respuestas compuestas y de rutas públicas =====================

export const actorMeDto = z.object({ actorId: z.string().uuid(), roles: z.array(roleSicefSchema) });

export const aplicarBorradorRespuestaDto = z.object({
  borrador: borradorCobroDto,
  cobro: cobroDto,
  factura: facturaDto.optional(),
});

export const cobroRespuestaDto = z.object({ cobro: cobroDto, factura: facturaDto.optional() });

export const aceptarSolicitudRespuestaDto = z.object({ solicitud: solicitudFacturaDto, factura: facturaDto });

export const archivoRefDto = z.object({ archivoUuid: z.string().uuid(), mimeType: z.string() });

export const consultaFacturaPublicaDto = z.object({
  estado: estadoFacturaSchema,
  uuid: z.string().optional(),
  xml: archivoRefDto.optional(),
  pdf: archivoRefDto.optional(),
  disponible: z.boolean(),
});

// Domicilio del predio (sólo constancias de No Registro). Es el domicilio que
// va impreso en la constancia, no el domicilio particular del titular.
export const domicilioPredioPublicoDto = z.object({
  calle: z.string().nullable(),
  numero: z.string().nullable(),
  colonia: z.string().nullable(),
  perteneceA: perteneceASchema.nullable(),
  perteneceANombre: z.string().nullable(),
});

// Respuesta de la verificación pública por QR. Expone el mínimo necesario para
// que quien escanea confirme que la constancia es suya: folio, tipo, vigencia,
// nombre del titular y —en No Registro— el domicilio del predio. Nunca salen
// RFC, identificadores internos ni personas distintas del titular.
export const verificacionConstanciaPublicaDto = z.object({
  valido: z.literal(true),
  folio: z.string(),
  tipo: tipoConstanciaSchema,
  estado: estadoVerificacionConstanciaSchema,
  vigenciaHasta: z.string(),
  titular: z.object({ nombreRazonSocial: z.string() }),
  domicilio: domicilioPredioPublicoDto.optional(),
});

export type VerificacionConstanciaPublica = z.infer<typeof verificacionConstanciaPublicaDto>;

// ===================== ENVOLVENTES ESTÁNDAR =====================
// Reflejan el formato real de backend/src/shared/errors.ts. `requestId` se marca
// opcional porque algunas rutas (p. ej. las públicas y /catalogos/requisitos/activo)
// no lo incluyen en la respuesta.

export function respuestaSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ data: dataSchema, requestId: z.string().optional() });
}

export function respuestaListaSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({ nextCursor: z.string().uuid().optional() }).optional(),
    requestId: z.string().optional(),
  });
}

export const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
  requestId: z.string().optional(),
});
