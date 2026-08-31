import { esApiError } from '@/api/errors';

// Catálogo de códigos que GAF puede devolver en la captura de una solicitud
// (packages/contracts + backend/src/api/error-handler.ts de GAF). Copy es-MX
// propio: los códigos de GSTS (api/errors.ts) no aplican aquí, son sistemas
// distintos con catálogos de error distintos.
const COPY_GAF_POR_CODIGO: Record<string, string> = {
  SOLICITUD_INVALIDA: 'Revisa los datos capturados: hay campos inválidos o faltantes.',
  CONTACTO_REQUERIDO: 'Captura al menos un medio de contacto: correo o teléfono.',
  SOLICITUD_PAGO_DUPLICADA: 'Esta constancia ya tiene una solicitud de factura activa en GAF.',
  USO_REGIMEN_INVALIDO: 'El uso de CFDI no es válido para el régimen fiscal elegido.',
  METODO_PAGO_NO_PERMITIDO: 'En esta etapa el método de pago sólo puede ser PUE.',
  ORIGEN_CANAL_NO_HABILITADO: 'Este origen no está habilitado para captura desde ventanilla.',
  POLITICA_NO_PUBLICADA: 'GAF no tiene una política de validación publicada para este origen.',
  ACTOR_CANAL_INVALIDO: 'Tu sesión no puede capturar esta solicitud en GAF. Contacta a TI.',
  REGLA_NEGOCIO_VIOLADA: 'La solicitud no cumple una regla de negocio de GAF.',
  FILE_TOO_LARGE: 'El comprobante excede el límite de tamaño permitido por GAF (10 MB).',
  REQUEST_FILES_TOO_LARGE: 'Los comprobantes exceden el límite acumulado permitido por GAF (20 MB).',
  FILE_TYPE_NOT_ALLOWED: 'El tipo de archivo no está permitido. Usa PDF, JPG o PNG.',
  FILE_INVALID: 'El archivo no es válido: su contenido no coincide con su tipo.',
  TOO_MANY_FILES: 'Se permiten como máximo tres comprobantes.',
  SAT_CATALOG_UNAVAILABLE: 'Los catálogos SAT no están disponibles para esa fecha de pago. Intenta de nuevo.',
  RATE_LIMITED: 'Demasiadas solicitudes a GAF en poco tiempo. Espera un momento e intenta de nuevo.',
  MISSING_ROLE: 'Tu cuenta no tiene permiso para capturar solicitudes en GAF. Contacta a TI.',
  AUTHENTICATION_REQUIRED: 'Tu sesión no es válida para GAF. Vuelve a iniciar sesión.',
  UNSUPPORTED_MEDIA_TYPE: 'Error al enviar el formulario a GAF. Intenta de nuevo.',
  MALFORMED_MULTIPART: 'Error al enviar el formulario a GAF. Intenta de nuevo.',
  ORIGIN_NOT_ALLOWED: 'GAF rechazó la conexión desde este origen. Contacta a TI.',
};

/** Mensaje en español listo para mostrar como banner de fallo. */
export function copyGaf(error: unknown): string {
  if (esApiError(error)) return COPY_GAF_POR_CODIGO[error.code] ?? error.message;
  return 'No se pudo contactar a GAF. Verifica tu conexión e intenta de nuevo.';
}

interface IssueGaf {
  path?: unknown[];
  message: string;
}

function issuesDe(error: unknown): IssueGaf[] {
  if (!esApiError(error) || !Array.isArray(error.details)) return [];
  return error.details.filter(
    (issue): issue is IssueGaf =>
      typeof issue === 'object' && issue !== null && typeof (issue as { message?: unknown }).message === 'string',
  );
}

/** Mensajes de validación (422 SOLICITUD_INVALIDA/CONTACTO_REQUERIDO), sin duplicados. */
export function detallesGaf(error: unknown): string[] {
  return [...new Set(issuesDe(error).map((issue) => issue.message))];
}

/** Mismos mensajes, indexados por el primer segmento del path — para pintarlos bajo cada campo. */
export function detalleGafPorCampo(error: unknown): Record<string, string> {
  const porCampo: Record<string, string> = {};
  for (const issue of issuesDe(error)) {
    const campo = String(issue.path?.[0] ?? '');
    if (campo && !porCampo[campo]) porCampo[campo] = issue.message;
  }
  return porCampo;
}
