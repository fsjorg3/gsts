// Normalización de errores de la API al catálogo del contrato
// (documentacion/CONTRATO_API_GSTS.md §7). El copy sigue el tono del design
// system: claro, accionable, sin jerga técnica.

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;
  public readonly requestId: string | undefined;

  public constructor(status: number, body: ApiErrorBody | undefined) {
    const code = body?.error.code ?? 'INTERNAL_ERROR';
    super(body?.error.message ?? 'Error inesperado');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = body?.error.details;
    this.requestId = body?.requestId;
  }

  /** Mensaje en español listo para mostrar al usuario. */
  public get copy(): string {
    return COPY_POR_CODIGO[this.code] ?? this.message;
  }
}

// Catálogo §7 → copy es-MX. Los códigos no listados caen al message del backend.
const COPY_POR_CODIGO: Record<string, string> = {
  UNAUTHENTICATED: 'Tu sesión no es válida. Vuelve a iniciar sesión.',
  INVALID_TOKEN: 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.',
  MISSING_ROLE: 'Tu cuenta no tiene un rol asignado en GSTS. Contacta a TI.',
  FORBIDDEN: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'No se encontró el registro solicitado.',
  VALIDATION_ERROR: 'Revisa los datos capturados: hay campos inválidos o faltantes.',
  NO_ACTIVE_CATALOG: 'No hay un catálogo de requisitos activo. TI debe publicar uno antes de crear trámites.',
  CATALOG_ALREADY_PUBLISHED: 'Este catálogo ya estaba publicado; no admite cambios.',
  CATALOG_INCOMPLETE: 'El catálogo no está completo. Corrige los errores señalados antes de publicar.',
  UNIQUE_CONFLICT: 'Ya existe otro elemento con esa clave u orden. Usa un valor distinto.',
  REFERENCE_CONFLICT: 'La operación choca con una referencia entre registros: el destino no existe o todavía está en uso.',
  TARIFF_INCOMPLETE: 'Faltan tipo de constancia, concepto o monto para crear la tarifa.',
  DRAFT_ALREADY_OPEN: 'Este trámite ya tiene un borrador de cobro abierto. Continúa con el existente.',
  DRAFT_NOT_OPEN: 'El borrador ya no está abierto; no se puede aplicar.',
  DRAFT_INCOMPLETE: 'Completa tarifa, forma y método de pago antes de aplicar el borrador.',
  INVALID_STATE: 'La acción no procede en el estado actual del trámite.',
  INVALID_VALIDITY: 'La vigencia de la constancia debe ser una fecha futura.',
  FILE_TOO_LARGE: 'El archivo excede el límite de 30 MB acumulados por trámite.',
  INVALID_PATH: 'La referencia del registro es inválida.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. Intenta de nuevo; si persiste, contacta a TI.',
};

export function esApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Copy seguro para cualquier error (ApiError o desconocido/red). */
export function copyDeError(error: unknown): string {
  if (esApiError(error)) return error.copy;
  return 'No se pudo contactar al servidor. Verifica tu conexión e intenta de nuevo.';
}
