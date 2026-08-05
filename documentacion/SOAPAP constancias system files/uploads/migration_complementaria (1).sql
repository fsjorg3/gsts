-- ============================================================
--  SICNAF — Migración SQL complementaria
--  SOAPAP · Reglas de integridad que Prisma no expresa
--
--  FLUJO DE USO:
--   1. Definir el modelo en schema.prisma.
--   2. Generar la migración base SIN aplicarla:
--        npx prisma migrate dev --name init --create-only
--   3. Pegar el contenido de este archivo AL FINAL del migration.sql
--      generado por Prisma (mismo archivo, misma transacción de migración).
--   4. Aplicar:
--        npx prisma migrate dev
--
--  Nota: los nombres de tablas/columnas son los mapeados con @map (snake_case).
--  Los tipos enum nativos de PostgreSQL llevan el nombre del enum de Prisma
--  (p. ej. "EstadoTramite"); aquí comparamos por su representación de texto.
--
--  Cambio importante: las llaves foráneas de auditoría (creado_por_id,
--  validado_por_id, confirmado_por_id, realizada_por_id, cobrado_por_id y
--  usuario_id de bitácora) YA NO se declaran aquí. Ahora son relaciones en
--  schema.prisma, administradas por Prisma. Declararlas manualmente aquí hacía
--  que `prisma migrate dev` las detectara como "drift" y generara una migración
--  que las borraba. Este archivo solo contiene objetos que Prisma no entiende.
-- ============================================================


-- ============================================================
-- 1) BITÁCORA APPEND-ONLY  (capa 1: trigger que aborta UPDATE/DELETE)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_bitacora_solo_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora es de solo anexado (append-only): no se permite % ', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bitacora_no_modificar
  BEFORE UPDATE OR DELETE ON bitacora
  FOR EACH ROW EXECUTE FUNCTION fn_bitacora_solo_insert();


-- ============================================================
-- 2) RESTRICCIONES CHECK  (invariantes de dominio)
-- ============================================================
ALTER TABLE cobro
  ADD CONSTRAINT chk_cobro_montos
  CHECK (monto_base >= 0 AND monto_final >= 0
         AND porcentaje_reduccion >= 0 AND porcentaje_reduccion <= 100);

ALTER TABLE constancia
  ADD CONSTRAINT chk_constancia_vigencia
  CHECK (vigencia_fin > vigencia_inicio);

ALTER TABLE factura
  ADD CONSTRAINT chk_factura_intentos
  CHECK (intentos >= 0);

ALTER TABLE tarifa
  ADD CONSTRAINT chk_tarifa_monto
  CHECK (monto >= 0);


-- ============================================================
-- 3) ÍNDICES ÚNICOS PARCIALES  (vigencia única)
--    Solo puede existir UNA versión de catálogo activa a la vez,
--    y UNA tarifa activa por tipo de constancia + concepto.
-- ============================================================
CREATE UNIQUE INDEX uq_version_catalogo_unica_activa
  ON version_catalogo ((activa)) WHERE activa;

CREATE UNIQUE INDEX uq_tarifa_unica_activa
  ON tarifa (tipo_constancia, concepto) WHERE activa;


-- ============================================================
-- 4) INMUTABILIDAD DEL CATÁLOGO PUBLICADO
--    Una versión publicada y sus hijos no se modifican; solo se permite
--    cambiar las banderas de vigencia (activa, vigente_hasta) en el encabezado.
-- ============================================================

-- Encabezado: bloquea cambios estructurales y DELETE de versiones publicadas.
CREATE OR REPLACE FUNCTION fn_version_catalogo_inmutable()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.publicada THEN
      RAISE EXCEPTION 'La versión de catálogo % está publicada y no se elimina', OLD.version;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.publicada AND (NEW.version <> OLD.version OR NEW.publicada <> OLD.publicada) THEN
    RAISE EXCEPTION 'La versión de catálogo % es inmutable (solo se permite cambiar vigencia)', OLD.version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_version_catalogo_inmutable
  BEFORE UPDATE OR DELETE ON version_catalogo
  FOR EACH ROW EXECUTE FUNCTION fn_version_catalogo_inmutable();

-- Helper: aborta si la versión está publicada.
CREATE OR REPLACE FUNCTION fn_bloquea_si_version_publicada(p_version_id uuid)
RETURNS void AS $$
DECLARE v_pub boolean;
BEGIN
  SELECT publicada INTO v_pub FROM version_catalogo WHERE id = p_version_id;
  IF v_pub THEN
    RAISE EXCEPTION 'El catálogo de la versión % está publicado y es inmutable', p_version_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grupos.
CREATE OR REPLACE FUNCTION fn_grupo_requisito_inmutable()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_bloquea_si_version_publicada(COALESCE(OLD.version_catalogo_id, NEW.version_catalogo_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grupo_requisito_inmutable
  BEFORE UPDATE OR DELETE ON grupo_requisito
  FOR EACH ROW EXECUTE FUNCTION fn_grupo_requisito_inmutable();

-- Opciones (versión vía grupo).
CREATE OR REPLACE FUNCTION fn_opcion_requisito_inmutable()
RETURNS TRIGGER AS $$
DECLARE v_version uuid;
BEGIN
  SELECT version_catalogo_id INTO v_version
    FROM grupo_requisito WHERE id = COALESCE(OLD.grupo_id, NEW.grupo_id);
  PERFORM fn_bloquea_si_version_publicada(v_version);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opcion_requisito_inmutable
  BEFORE UPDATE OR DELETE ON opcion_requisito
  FOR EACH ROW EXECUTE FUNCTION fn_opcion_requisito_inmutable();

-- Documentos de opción (versión vía opción -> grupo).
CREATE OR REPLACE FUNCTION fn_opcion_documento_inmutable()
RETURNS TRIGGER AS $$
DECLARE v_version uuid;
BEGIN
  SELECT g.version_catalogo_id INTO v_version
    FROM opcion_requisito o
    JOIN grupo_requisito g ON g.id = o.grupo_id
    WHERE o.id = COALESCE(OLD.opcion_id, NEW.opcion_id);
  PERFORM fn_bloquea_si_version_publicada(v_version);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opcion_documento_inmutable
  BEFORE UPDATE OR DELETE ON opcion_documento
  FOR EACH ROW EXECUTE FUNCTION fn_opcion_documento_inmutable();


-- ============================================================
-- 5) INMUTABILIDAD DE TARIFAS PUBLICADAS
--    Un precio publicado no se edita: un cambio de precio es una fila nueva
--    (nueva versión). Solo se permite ajustar la vigencia.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_tarifa_inmutable()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.publicada THEN
      RAISE EXCEPTION 'La tarifa publicada (% v%) no se elimina', OLD.tipo_constancia, OLD.version;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.publicada AND (NEW.monto <> OLD.monto
                        OR NEW.version <> OLD.version
                        OR NEW.tipo_constancia <> OLD.tipo_constancia
                        OR NEW.concepto <> OLD.concepto) THEN
    RAISE EXCEPTION 'La tarifa publicada es inmutable; un cambio de precio es una versión nueva';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tarifa_inmutable
  BEFORE UPDATE OR DELETE ON tarifa
  FOR EACH ROW EXECUTE FUNCTION fn_tarifa_inmutable();


-- ============================================================
-- 6) GUARDAS DE TRANSICIÓN DE ESTADO  (segunda red; la primaria es el backend)
-- ============================================================

-- Trámite.
CREATE OR REPLACE FUNCTION fn_tramite_transicion_valida()
RETURNS TRIGGER AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW;
  END IF;
  ok := (
    (OLD.estado::text = 'CAPTURA'       AND NEW.estado::text = 'EN_VALIDACION') OR
    (OLD.estado::text = 'EN_VALIDACION' AND NEW.estado::text IN ('APROBADO','RECHAZADO')) OR
    (OLD.estado::text = 'APROBADO'      AND NEW.estado::text IN ('COBRO','RECHAZADO','EXPIRADO')) OR
    (OLD.estado::text = 'COBRO'         AND NEW.estado::text = 'FINALIZADO')
  );
  IF NOT ok THEN
    RAISE EXCEPTION 'Transición de trámite no permitida: % -> %', OLD.estado, NEW.estado;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tramite_transicion_valida
  BEFORE UPDATE OF estado ON tramite
  FOR EACH ROW EXECUTE FUNCTION fn_tramite_transicion_valida();

-- Factura (sub-estados del timbrado).
CREATE OR REPLACE FUNCTION fn_factura_transicion_valida()
RETURNS TRIGGER AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW;
  END IF;
  ok := (
    (OLD.estado::text = 'PENDIENTE'           AND NEW.estado::text = 'TIMBRADO_EN_PROCESO') OR
    (OLD.estado::text = 'TIMBRADO_EN_PROCESO' AND NEW.estado::text IN ('TIMBRADO','TIMBRADO_FALLIDO')) OR
    (OLD.estado::text = 'TIMBRADO_FALLIDO'    AND NEW.estado::text = 'TIMBRADO_EN_PROCESO') OR
    (OLD.estado::text = 'TIMBRADO'            AND NEW.estado::text = 'CANCELADO')
  );
  IF NOT ok THEN
    RAISE EXCEPTION 'Transición de factura no permitida: % -> %', OLD.estado, NEW.estado;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_factura_transicion_valida
  BEFORE UPDATE OF estado ON factura
  FOR EACH ROW EXECUTE FUNCTION fn_factura_transicion_valida();


-- ============================================================
-- 7) VISTA DE ESTADO EFECTIVO  (para el Dashboard)
--    Combina el estado del trámite con el sub-estado del timbrado cuando aplica.
-- ============================================================
CREATE OR REPLACE VIEW v_tramite_estado AS
SELECT
  t.id,
  t.numero_tramite,
  t.tipo_constancia,
  t.estado AS estado_tramite,
  f.estado AS estado_factura,
  CASE
    WHEN t.estado::text = 'COBRO' AND f.estado IS NOT NULL
      THEN f.estado::text
    ELSE t.estado::text
  END AS estado_efectivo,
  t.created_at,
  t.updated_at
FROM tramite t
LEFT JOIN cobro   c ON c.tramite_id = t.id
LEFT JOIN factura f ON f.cobro_id   = c.id;


-- ============================================================
-- 8) ROL DE BASE DE DATOS DE LA APLICACIÓN  (capa 2 del append-only)
--    Ejecutar con un superusuario. La contraseña se inyecta vía secret manager;
--    NUNCA se versiona en el repositorio. Descomentar y ajustar en despliegue.
-- ============================================================
-- CREATE ROLE app_sicnaf LOGIN PASSWORD :'app_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_sicnaf;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_sicnaf;
-- -- La aplicación puede INSERTAR en la bitácora, pero nunca modificarla ni borrarla:
-- REVOKE UPDATE, DELETE ON bitacora FROM app_sicnaf;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_sicnaf;
