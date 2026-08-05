-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoConstancia" AS ENUM ('NO_ADEUDO', 'NO_REGISTRO');

-- CreateEnum
CREATE TYPE "Personalidad" AS ENUM ('FISICA', 'MORAL');

-- CreateEnum
CREATE TYPE "Representacion" AS ENUM ('TITULAR', 'REPRESENTANTE', 'APODERADO');

-- CreateEnum
CREATE TYPE "RolPersona" AS ENUM ('TITULAR', 'REPRESENTANTE', 'APODERADO', 'RECEPTOR_FISCAL');

-- CreateEnum
CREATE TYPE "EstadoTramite" AS ENUM ('CAPTURA', 'EN_VALIDACION', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'COBRO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'TIMBRADO_EN_PROCESO', 'TIMBRADO', 'TIMBRADO_FALLIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoBorradorCobro" AS ENUM ('ABIERTO', 'APLICADO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoSolicitudFactura" AS ENUM ('PENDIENTE_REVISION', 'ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoConservacionArchivo" AS ENUM ('ACTIVO', 'RETENIDO', 'ELIMINADO_LOGICO');

-- CreateEnum
CREATE TYPE "OrigenBitacora" AS ENUM ('USUARIO', 'SISTEMA', 'WORKER', 'PORTAL');

-- CreateEnum
CREATE TYPE "MetodoValidacion" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "MomentoValidacion" AS ENUM ('VALIDACION_INICIAL', 'REVALIDACION_COBRO');

-- CreateEnum
CREATE TYPE "ResultadoValidacion" AS ENUM ('SIN_ADEUDO', 'CON_ADEUDO');

-- CreateEnum
CREATE TYPE "TipoConfirmacion" AS ENUM ('SIN_ADEUDO_OUC', 'FIRMAS_LEGIBLES', 'FACULTADES_PODER');

-- CreateEnum
CREATE TYPE "EstadoEvidencia" AS ENUM ('CARGADO', 'VALIDADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('PUE', 'PPD');

-- CreateTable
CREATE TABLE "actor" (
    "id" UUID NOT NULL,
    "keycloak_sub" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" UUID NOT NULL,
    "tipo" "Personalidad" NOT NULL,
    "nombre_razon_social" TEXT NOT NULL,
    "rfc" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramite_persona" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "rol" "RolPersona" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tramite_persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_catalogo" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "vigente_desde" TIMESTAMPTZ(3),
    "vigente_hasta" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "version_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_requisito" (
    "id" UUID NOT NULL,
    "version_catalogo_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "aplica_tipo" "TipoConstancia",
    "aplica_personalidad" "Personalidad",
    "aplica_representacion" "Representacion",

    CONSTRAINT "grupo_requisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_requisito" (
    "id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "opcion_requisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_documento" (
    "id" UUID NOT NULL,
    "opcion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "opcion_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramite" (
    "id" UUID NOT NULL,
    "numero_tramite" SERIAL NOT NULL,
    "tipo_constancia" "TipoConstancia" NOT NULL,
    "personalidad" "Personalidad" NOT NULL,
    "representacion" "Representacion" NOT NULL,
    "nis" TEXT,
    "version_catalogo_id" UUID NOT NULL,
    "estado" "EstadoTramite" NOT NULL DEFAULT 'CAPTURA',
    "plazo_pago_hasta" TIMESTAMPTZ(3),
    "motivo_rechazo" TEXT,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "opcion_documento_id" UUID NOT NULL,
    "archivo_uuid" UUID NOT NULL,
    "nombre_original" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'CARGADO',
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validacion_no_adeudo" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "metodo" "MetodoValidacion" NOT NULL,
    "momento" "MomentoValidacion" NOT NULL,
    "resultado" "ResultadoValidacion" NOT NULL,
    "adeudo_monto" DECIMAL(12,2),
    "referencia_ouc" TEXT,
    "validado_por_id" UUID,
    "validado_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validacion_no_adeudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmacion_manual" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "tipo" "TipoConfirmacion" NOT NULL,
    "observacion" TEXT,
    "confirmado_por_id" UUID NOT NULL,
    "confirmado_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confirmacion_manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consulta_concesionaria" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "observacion" TEXT NOT NULL,
    "realizada_por_id" UUID NOT NULL,
    "realizada_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_concesionaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifa" (
    "id" UUID NOT NULL,
    "tipo_constancia" "TipoConstancia" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "vigente_desde" TIMESTAMPTZ(3),
    "vigente_hasta" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_plazos" (
    "id" TEXT NOT NULL DEFAULT 'PLAZOS_OPERATIVOS',
    "plazo_pago_dias" INTEGER NOT NULL DEFAULT 0,
    "plazo_solicitud_factura_dias" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "actualizado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracion_plazos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrador_cobro" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "tarifa_id" UUID,
    "monto_base" DECIMAL(12,2),
    "porcentaje_reduccion" DECIMAL(5,2),
    "monto_final" DECIMAL(12,2),
    "forma_pago" TEXT,
    "metodo_pago" "MetodoPago",
    "moneda" TEXT DEFAULT 'MXN',
    "requiere_factura" BOOLEAN,
    "referencia_pago" TEXT,
    "estado" "EstadoBorradorCobro" NOT NULL DEFAULT 'ABIERTO',
    "creado_por_id" UUID NOT NULL,
    "actualizado_por_id" UUID NOT NULL,
    "cobro_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "aplicado_at" TIMESTAMPTZ(3),
    "vencido_at" TIMESTAMPTZ(3),
    "cancelado_at" TIMESTAMPTZ(3),

    CONSTRAINT "borrador_cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobro" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "tarifa_id" UUID NOT NULL,
    "monto_base" DECIMAL(12,2) NOT NULL,
    "porcentaje_reduccion" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "monto_final" DECIMAL(12,2) NOT NULL,
    "forma_pago" TEXT NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "requiere_factura" BOOLEAN NOT NULL DEFAULT false,
    "referencia_pago" TEXT,
    "cobrado_por_id" UUID NOT NULL,
    "cobrado_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constancia" (
    "id" UUID NOT NULL,
    "tramite_id" UUID NOT NULL,
    "folio_unico" TEXT NOT NULL,
    "hash_pdf" TEXT NOT NULL,
    "archivo_uuid" UUID NOT NULL,
    "firma_digital" TEXT,
    "certificado_id" TEXT,
    "emitida_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigencia_inicio" TIMESTAMPTZ(3) NOT NULL,
    "vigencia_fin" TIMESTAMPTZ(3) NOT NULL,
    "anulada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "constancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura" (
    "id" UUID NOT NULL,
    "cobro_id" UUID NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "receptor_rfc" TEXT,
    "receptor_nombre" TEXT,
    "receptor_cp" TEXT,
    "receptor_regimen" TEXT,
    "uso_cfdi" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "uuid" TEXT,
    "xml_ruta" TEXT,
    "pdf_ruta" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,
    "timbrada_at" TIMESTAMPTZ(3),
    "cancelada_at" TIMESTAMPTZ(3),
    "motivo_cancelacion" TEXT,
    "uuid_sustituto" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_factura" (
    "id" UUID NOT NULL,
    "cobro_id" UUID NOT NULL,
    "factura_id" UUID,
    "estado" "EstadoSolicitudFactura" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "receptor_rfc" TEXT NOT NULL,
    "receptor_nombre" TEXT NOT NULL,
    "receptor_cp" TEXT NOT NULL,
    "receptor_regimen" TEXT NOT NULL,
    "uso_cfdi" TEXT NOT NULL,
    "fecha_limite" TIMESTAMPTZ(3) NOT NULL,
    "solicitada_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_por_id" UUID,
    "resuelta_at" TIMESTAMPTZ(3),
    "motivo_rechazo" TEXT,

    CONSTRAINT "solicitud_factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_global" (
    "id" UUID NOT NULL,
    "periodo_inicio" TIMESTAMPTZ(3) NOT NULL,
    "periodo_fin" TIMESTAMPTZ(3) NOT NULL,
    "receptor_rfc" TEXT NOT NULL,
    "receptor_nombre" TEXT NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "idempotency_key" TEXT NOT NULL,
    "uuid" TEXT,
    "timbrada_at" TIMESTAMPTZ(3),
    "cancelada_at" TIMESTAMPTZ(3),
    "motivo_cancelacion" TEXT,
    "uuid_sustituto" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "factura_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_global_detalle" (
    "id" UUID NOT NULL,
    "factura_global_id" UUID NOT NULL,
    "cobro_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factura_global_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivo_generado" (
    "id" UUID NOT NULL,
    "constancia_id" UUID,
    "factura_id" UUID,
    "factura_global_id" UUID,
    "tipo" TEXT NOT NULL,
    "archivo_uuid" UUID NOT NULL,
    "ruta" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "conservacion" "EstadoConservacionArchivo" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivo_generado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "roles_snapshot" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "origen" "OrigenBitacora" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" UUID NOT NULL,
    "accion" TEXT NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "request_id" UUID,
    "job_id" TEXT,
    "correccion_de_id" UUID,
    "detalle" JSONB,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actor_keycloak_sub_key" ON "actor"("keycloak_sub");

-- CreateIndex
CREATE INDEX "tramite_persona_tramite_id_idx" ON "tramite_persona"("tramite_id");

-- CreateIndex
CREATE UNIQUE INDEX "tramite_persona_tramite_id_persona_id_rol_key" ON "tramite_persona"("tramite_id", "persona_id", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "version_catalogo_version_key" ON "version_catalogo"("version");

-- CreateIndex
CREATE INDEX "grupo_requisito_version_catalogo_id_idx" ON "grupo_requisito"("version_catalogo_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_requisito_version_catalogo_id_clave_key" ON "grupo_requisito"("version_catalogo_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "opcion_requisito_grupo_id_clave_key" ON "opcion_requisito"("grupo_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "tramite_numero_tramite_key" ON "tramite"("numero_tramite");

-- CreateIndex
CREATE INDEX "tramite_estado_idx" ON "tramite"("estado");

-- CreateIndex
CREATE INDEX "tramite_creado_por_id_idx" ON "tramite"("creado_por_id");

-- CreateIndex
CREATE INDEX "tramite_created_at_idx" ON "tramite"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_archivo_uuid_key" ON "evidencia"("archivo_uuid");

-- CreateIndex
CREATE INDEX "evidencia_tramite_id_idx" ON "evidencia"("tramite_id");

-- CreateIndex
CREATE INDEX "evidencia_opcion_documento_id_idx" ON "evidencia"("opcion_documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "validacion_no_adeudo_tramite_id_momento_key" ON "validacion_no_adeudo"("tramite_id", "momento");

-- CreateIndex
CREATE UNIQUE INDEX "confirmacion_manual_tramite_id_tipo_key" ON "confirmacion_manual"("tramite_id", "tipo");

-- CreateIndex
CREATE INDEX "consulta_concesionaria_tramite_id_idx" ON "consulta_concesionaria"("tramite_id");

-- CreateIndex
CREATE UNIQUE INDEX "tarifa_tipo_constancia_concepto_version_key" ON "tarifa"("tipo_constancia", "concepto", "version");

-- CreateIndex
CREATE UNIQUE INDEX "borrador_cobro_cobro_id_key" ON "borrador_cobro"("cobro_id");

-- CreateIndex
CREATE INDEX "borrador_cobro_tramite_id_estado_idx" ON "borrador_cobro"("tramite_id", "estado");

-- CreateIndex
CREATE INDEX "borrador_cobro_tarifa_id_idx" ON "borrador_cobro"("tarifa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cobro_tramite_id_key" ON "cobro"("tramite_id");

-- CreateIndex
CREATE UNIQUE INDEX "constancia_tramite_id_key" ON "constancia"("tramite_id");

-- CreateIndex
CREATE UNIQUE INDEX "constancia_folio_unico_key" ON "constancia"("folio_unico");

-- CreateIndex
CREATE UNIQUE INDEX "constancia_archivo_uuid_key" ON "constancia"("archivo_uuid");

-- CreateIndex
CREATE INDEX "constancia_folio_unico_idx" ON "constancia"("folio_unico");

-- CreateIndex
CREATE UNIQUE INDEX "factura_cobro_id_key" ON "factura"("cobro_id");

-- CreateIndex
CREATE UNIQUE INDEX "factura_idempotency_key_key" ON "factura"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "factura_uuid_key" ON "factura"("uuid");

-- CreateIndex
CREATE INDEX "factura_estado_idx" ON "factura"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_factura_factura_id_key" ON "solicitud_factura"("factura_id");

-- CreateIndex
CREATE INDEX "solicitud_factura_cobro_id_estado_idx" ON "solicitud_factura"("cobro_id", "estado");

-- CreateIndex
CREATE INDEX "solicitud_factura_estado_solicitada_at_idx" ON "solicitud_factura"("estado", "solicitada_at");

-- CreateIndex
CREATE UNIQUE INDEX "factura_global_idempotency_key_key" ON "factura_global"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "factura_global_uuid_key" ON "factura_global"("uuid");

-- CreateIndex
CREATE INDEX "factura_global_estado_idx" ON "factura_global"("estado");

-- CreateIndex
CREATE INDEX "factura_global_periodo_inicio_periodo_fin_idx" ON "factura_global"("periodo_inicio", "periodo_fin");

-- CreateIndex
CREATE UNIQUE INDEX "factura_global_detalle_cobro_id_key" ON "factura_global_detalle"("cobro_id");

-- CreateIndex
CREATE INDEX "factura_global_detalle_factura_global_id_idx" ON "factura_global_detalle"("factura_global_id");

-- CreateIndex
CREATE UNIQUE INDEX "archivo_generado_archivo_uuid_key" ON "archivo_generado"("archivo_uuid");

-- CreateIndex
CREATE INDEX "archivo_generado_constancia_id_idx" ON "archivo_generado"("constancia_id");

-- CreateIndex
CREATE INDEX "archivo_generado_factura_id_idx" ON "archivo_generado"("factura_id");

-- CreateIndex
CREATE INDEX "archivo_generado_factura_global_id_idx" ON "archivo_generado"("factura_global_id");

-- CreateIndex
CREATE INDEX "bitacora_entidad_entidad_id_idx" ON "bitacora"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "bitacora_request_id_idx" ON "bitacora"("request_id");

-- CreateIndex
CREATE INDEX "bitacora_timestamp_idx" ON "bitacora"("timestamp");

-- CreateIndex
CREATE INDEX "bitacora_correccion_de_id_idx" ON "bitacora"("correccion_de_id");

-- AddForeignKey
ALTER TABLE "tramite_persona" ADD CONSTRAINT "tramite_persona_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramite_persona" ADD CONSTRAINT "tramite_persona_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_requisito" ADD CONSTRAINT "grupo_requisito_version_catalogo_id_fkey" FOREIGN KEY ("version_catalogo_id") REFERENCES "version_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_requisito" ADD CONSTRAINT "opcion_requisito_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_documento" ADD CONSTRAINT "opcion_documento_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opcion_requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramite" ADD CONSTRAINT "tramite_version_catalogo_id_fkey" FOREIGN KEY ("version_catalogo_id") REFERENCES "version_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramite" ADD CONSTRAINT "tramite_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_opcion_documento_id_fkey" FOREIGN KEY ("opcion_documento_id") REFERENCES "opcion_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacion_no_adeudo" ADD CONSTRAINT "validacion_no_adeudo_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacion_no_adeudo" ADD CONSTRAINT "validacion_no_adeudo_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmacion_manual" ADD CONSTRAINT "confirmacion_manual_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmacion_manual" ADD CONSTRAINT "confirmacion_manual_confirmado_por_id_fkey" FOREIGN KEY ("confirmado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_concesionaria" ADD CONSTRAINT "consulta_concesionaria_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_concesionaria" ADD CONSTRAINT "consulta_concesionaria_realizada_por_id_fkey" FOREIGN KEY ("realizada_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_plazos" ADD CONSTRAINT "configuracion_plazos_actualizado_por_id_fkey" FOREIGN KEY ("actualizado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrador_cobro" ADD CONSTRAINT "borrador_cobro_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrador_cobro" ADD CONSTRAINT "borrador_cobro_tarifa_id_fkey" FOREIGN KEY ("tarifa_id") REFERENCES "tarifa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrador_cobro" ADD CONSTRAINT "borrador_cobro_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrador_cobro" ADD CONSTRAINT "borrador_cobro_actualizado_por_id_fkey" FOREIGN KEY ("actualizado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrador_cobro" ADD CONSTRAINT "borrador_cobro_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobro" ADD CONSTRAINT "cobro_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobro" ADD CONSTRAINT "cobro_tarifa_id_fkey" FOREIGN KEY ("tarifa_id") REFERENCES "tarifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobro" ADD CONSTRAINT "cobro_cobrado_por_id_fkey" FOREIGN KEY ("cobrado_por_id") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constancia" ADD CONSTRAINT "constancia_tramite_id_fkey" FOREIGN KEY ("tramite_id") REFERENCES "tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_factura" ADD CONSTRAINT "solicitud_factura_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_factura" ADD CONSTRAINT "solicitud_factura_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_factura" ADD CONSTRAINT "solicitud_factura_resuelta_por_id_fkey" FOREIGN KEY ("resuelta_por_id") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_global_detalle" ADD CONSTRAINT "factura_global_detalle_factura_global_id_fkey" FOREIGN KEY ("factura_global_id") REFERENCES "factura_global"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_global_detalle" ADD CONSTRAINT "factura_global_detalle_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo_generado" ADD CONSTRAINT "archivo_generado_constancia_id_fkey" FOREIGN KEY ("constancia_id") REFERENCES "constancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo_generado" ADD CONSTRAINT "archivo_generado_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo_generado" ADD CONSTRAINT "archivo_generado_factura_global_id_fkey" FOREIGN KEY ("factura_global_id") REFERENCES "factura_global"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_correccion_de_id_fkey" FOREIGN KEY ("correccion_de_id") REFERENCES "bitacora"("id") ON DELETE SET NULL ON UPDATE CASCADE;
