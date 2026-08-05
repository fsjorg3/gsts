-- SICEF: reglas de integridad no expresables en Prisma.
-- Debe ejecutarse al final de una migracion correctiva, despues de aplicar
-- schema.prisma. Las sentencias DROP permiten sustituir las reglas v1.

DROP TRIGGER IF EXISTS trg_grupo_requisito_inmutable ON grupo_requisito;
DROP TRIGGER IF EXISTS trg_opcion_requisito_inmutable ON opcion_requisito;
DROP TRIGGER IF EXISTS trg_opcion_documento_inmutable ON opcion_documento;
DROP TRIGGER IF EXISTS trg_version_catalogo_inmutable ON version_catalogo;
DROP TRIGGER IF EXISTS trg_tarifa_inmutable ON tarifa;
DROP TRIGGER IF EXISTS trg_tramite_transicion_valida ON tramite;
DROP TRIGGER IF EXISTS trg_factura_transicion_valida ON factura;
DROP TRIGGER IF EXISTS trg_bitacora_no_modificar ON bitacora;
DROP TRIGGER IF EXISTS trg_evidencia_integridad ON evidencia;
DROP TRIGGER IF EXISTS trg_cobro_integridad ON cobro;
DROP TRIGGER IF EXISTS trg_factura_integridad ON factura;
DROP TRIGGER IF EXISTS trg_factura_global_integridad ON factura_global;
DROP TRIGGER IF EXISTS trg_factura_global_detalle_integridad ON factura_global_detalle;
DROP TRIGGER IF EXISTS trg_archivo_generado_inmutable ON archivo_generado;
DROP TRIGGER IF EXISTS trg_constancia_inmutable ON constancia;
DROP TRIGGER IF EXISTS trg_bitacora_protegida ON bitacora;
DROP TRIGGER IF EXISTS trg_tramite_sin_borrado ON tramite;
DROP TRIGGER IF EXISTS trg_cobro_sin_borrado ON cobro;
DROP TRIGGER IF EXISTS trg_factura_sin_borrado ON factura;
DROP TRIGGER IF EXISTS trg_factura_global_sin_borrado ON factura_global;
DROP TRIGGER IF EXISTS trg_evidencia_sin_borrado ON evidencia;
DROP TRIGGER IF EXISTS trg_configuracion_plazos_integridad ON configuracion_plazos;
DROP TRIGGER IF EXISTS trg_borrador_cobro_integridad ON borrador_cobro;
DROP TRIGGER IF EXISTS trg_solicitud_factura_integridad ON solicitud_factura;
-- La identidad y los roles se validan en Keycloak. Esta capa sólo recibe el
-- contexto transaccional que el backend ya autenticó criptográficamente.

ALTER TABLE version_catalogo DROP CONSTRAINT IF EXISTS chk_version_catalogo_publicacion;
ALTER TABLE version_catalogo ADD CONSTRAINT chk_version_catalogo_publicacion
  CHECK (NOT activa OR publicada);
ALTER TABLE version_catalogo DROP CONSTRAINT IF EXISTS chk_version_catalogo_vigencia;
ALTER TABLE version_catalogo ADD CONSTRAINT chk_version_catalogo_vigencia
  CHECK (vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta > vigente_desde);
ALTER TABLE tarifa DROP CONSTRAINT IF EXISTS chk_tarifa_monto;
ALTER TABLE tarifa ADD CONSTRAINT chk_tarifa_monto CHECK (monto > 0);
ALTER TABLE tarifa DROP CONSTRAINT IF EXISTS chk_tarifa_publicacion;
ALTER TABLE tarifa ADD CONSTRAINT chk_tarifa_publicacion CHECK (NOT activa OR publicada);
ALTER TABLE tarifa DROP CONSTRAINT IF EXISTS chk_tarifa_vigencia;
ALTER TABLE tarifa ADD CONSTRAINT chk_tarifa_vigencia
  CHECK (vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta > vigente_desde);
ALTER TABLE motivo_reduccion DROP CONSTRAINT IF EXISTS chk_motivo_reduccion_porcentaje;
ALTER TABLE motivo_reduccion ADD CONSTRAINT chk_motivo_reduccion_porcentaje
  CHECK (porcentaje > 0 AND porcentaje <= 100);
ALTER TABLE cobro DROP CONSTRAINT IF EXISTS chk_cobro_montos;
ALTER TABLE cobro ADD CONSTRAINT chk_cobro_montos
  CHECK (monto_base > 0 AND monto_final > 0
    AND porcentaje_reduccion >= 0 AND porcentaje_reduccion <= 100
    AND monto_final = round(monto_base * (1 - porcentaje_reduccion / 100), 2));
ALTER TABLE evidencia DROP CONSTRAINT IF EXISTS chk_evidencia_archivo;
ALTER TABLE evidencia ADD CONSTRAINT chk_evidencia_archivo CHECK (
  tamano_bytes > 0
  AND hash_sha256 ~ '^[0-9a-fA-F]{64}$'
  AND mime_type IN ('application/pdf', 'image/jpeg', 'image/png')
);
ALTER TABLE archivo_generado DROP CONSTRAINT IF EXISTS chk_archivo_generado_ref;
ALTER TABLE archivo_generado ADD CONSTRAINT chk_archivo_generado_ref CHECK (
  num_nonnulls(constancia_id, factura_id, factura_global_id) = 1
  AND tamano_bytes > 0
  AND hash_sha256 ~ '^[0-9a-fA-F]{64}$'
);
ALTER TABLE factura_global DROP CONSTRAINT IF EXISTS chk_factura_global_periodo;
ALTER TABLE factura_global ADD CONSTRAINT chk_factura_global_periodo CHECK (periodo_fin > periodo_inicio);
ALTER TABLE configuracion_plazos DROP CONSTRAINT IF EXISTS chk_configuracion_plazos_singleton;
ALTER TABLE configuracion_plazos ADD CONSTRAINT chk_configuracion_plazos_singleton
  CHECK (id = 'PLAZOS_OPERATIVOS');
ALTER TABLE configuracion_plazos DROP CONSTRAINT IF EXISTS chk_configuracion_plazos_valores;
ALTER TABLE configuracion_plazos ADD CONSTRAINT chk_configuracion_plazos_valores
  CHECK (NOT activa OR (plazo_pago_dias > 0 AND plazo_solicitud_factura_dias > 0));
ALTER TABLE borrador_cobro DROP CONSTRAINT IF EXISTS chk_borrador_cobro_montos;
ALTER TABLE borrador_cobro ADD CONSTRAINT chk_borrador_cobro_montos CHECK (
  (monto_base IS NULL OR monto_base > 0)
  AND (monto_final IS NULL OR monto_final > 0)
  AND (porcentaje_reduccion IS NULL OR (porcentaje_reduccion >= 0 AND porcentaje_reduccion <= 100))
  AND (monto_base IS NULL OR porcentaje_reduccion IS NULL OR monto_final IS NULL
       OR monto_final = round(monto_base * (1 - porcentaje_reduccion / 100), 2))
);
ALTER TABLE solicitud_factura DROP CONSTRAINT IF EXISTS chk_solicitud_factura_fecha_limite;
ALTER TABLE solicitud_factura ADD CONSTRAINT chk_solicitud_factura_fecha_limite
  CHECK (fecha_limite >= solicitada_at);
ALTER TABLE solicitud_factura DROP CONSTRAINT IF EXISTS chk_solicitud_factura_receptor;
ALTER TABLE solicitud_factura ADD CONSTRAINT chk_solicitud_factura_receptor CHECK (
  btrim(receptor_rfc) <> '' AND btrim(receptor_nombre) <> '' AND btrim(receptor_cp) <> ''
  AND btrim(receptor_regimen) <> '' AND btrim(uso_cfdi) <> ''
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_version_catalogo_unica_activa
  ON version_catalogo ((activa)) WHERE activa;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tarifa_unica_activa
  ON tarifa (tipo_constancia, concepto) WHERE activa;
CREATE UNIQUE INDEX IF NOT EXISTS uq_borrador_cobro_unico_abierto
  ON borrador_cobro (tramite_id) WHERE estado = 'ABIERTO';
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_factura_unica_pendiente
  ON solicitud_factura (cobro_id) WHERE estado = 'PENDIENTE_REVISION';
CREATE OR REPLACE FUNCTION fn_contexto_actor_id()
RETURNS uuid AS $$
DECLARE valor text;
BEGIN
  valor := current_setting('app.actor_id', true);
  IF valor IS NULL OR btrim(valor) = '' THEN
    RAISE EXCEPTION 'Falta el contexto transaccional app.actor_id';
  END IF;
  BEGIN
    RETURN valor::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'El contexto app.actor_id no es un UUID válido';
  END;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_contexto_roles()
RETURNS jsonb AS $$
DECLARE valor text; roles jsonb;
BEGIN
  valor := current_setting('app.roles', true);
  IF valor IS NULL OR btrim(valor) = '' THEN
    RAISE EXCEPTION 'Falta el contexto transaccional app.roles';
  END IF;
  BEGIN
    roles := valor::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'El contexto app.roles debe ser un arreglo JSON válido';
  END;
  IF jsonb_typeof(roles) <> 'array' THEN
    RAISE EXCEPTION 'El contexto app.roles debe ser un arreglo JSON';
  END IF;
  RETURN roles;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_contexto_exige_actor(p_actor_id uuid)
RETURNS void AS $$
BEGIN
  IF p_actor_id IS NULL OR fn_contexto_actor_id() <> p_actor_id THEN
    RAISE EXCEPTION 'El actor atribuido no coincide con app.actor_id';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_contexto_exige_rol(p_rol text)
RETURNS void AS $$
BEGIN
  IF NOT (fn_contexto_roles() ? p_rol) THEN
    RAISE EXCEPTION 'El contexto no contiene el rol requerido: %', p_rol;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_version_publicada(p_version_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE((SELECT publicada FROM version_catalogo WHERE id = p_version_id), false);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION fn_version_catalogo_inmutable()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_contexto_exige_rol('ti');
  IF TG_OP = 'DELETE' AND OLD.publicada THEN
    RAISE EXCEPTION 'La version de catalogo publicada no se elimina';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.publicada
     AND (NEW.id, NEW.version, NEW.publicada, NEW.vigente_desde, NEW.created_at)
           IS DISTINCT FROM (OLD.id, OLD.version, OLD.publicada, OLD.vigente_desde, OLD.created_at) THEN
    RAISE EXCEPTION 'La version de catalogo publicada solo permite modificar su vigencia';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_grupo_requisito_inmutable()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_contexto_exige_rol('ti');
  IF TG_OP <> 'INSERT' AND fn_version_publicada(OLD.version_catalogo_id) THEN
    RAISE EXCEPTION 'No se modifica la estructura de un catalogo publicado';
  END IF;
  IF TG_OP <> 'DELETE' AND fn_version_publicada(NEW.version_catalogo_id) THEN
    RAISE EXCEPTION 'No se inserta ni mueve estructura a un catalogo publicado';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_opcion_requisito_inmutable()
RETURNS trigger AS $$
DECLARE version_anterior uuid; version_nueva uuid;
BEGIN
  PERFORM fn_contexto_exige_rol('ti');
  IF TG_OP <> 'INSERT' THEN
    SELECT version_catalogo_id INTO version_anterior FROM grupo_requisito WHERE id = OLD.grupo_id;
    IF fn_version_publicada(version_anterior) THEN RAISE EXCEPTION 'No se modifica la estructura de un catalogo publicado'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT version_catalogo_id INTO version_nueva FROM grupo_requisito WHERE id = NEW.grupo_id;
    IF fn_version_publicada(version_nueva) THEN RAISE EXCEPTION 'No se inserta ni mueve estructura a un catalogo publicado'; END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_opcion_documento_inmutable()
RETURNS trigger AS $$
DECLARE version_anterior uuid; version_nueva uuid;
BEGIN
  PERFORM fn_contexto_exige_rol('ti');
  IF TG_OP <> 'INSERT' THEN
    SELECT g.version_catalogo_id INTO version_anterior FROM opcion_requisito o JOIN grupo_requisito g ON g.id = o.grupo_id WHERE o.id = OLD.opcion_id;
    IF fn_version_publicada(version_anterior) THEN RAISE EXCEPTION 'No se modifica la estructura de un catalogo publicado'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT g.version_catalogo_id INTO version_nueva FROM opcion_requisito o JOIN grupo_requisito g ON g.id = o.grupo_id WHERE o.id = NEW.opcion_id;
    IF fn_version_publicada(version_nueva) THEN RAISE EXCEPTION 'No se inserta ni mueve estructura a un catalogo publicado'; END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_tarifa_inmutable()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_contexto_exige_rol('ti');
  IF TG_OP = 'DELETE' AND OLD.publicada THEN RAISE EXCEPTION 'La tarifa publicada no se elimina'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.publicada AND
     (NEW.id, NEW.tipo_constancia, NEW.concepto, NEW.monto, NEW.version, NEW.publicada, NEW.vigente_desde, NEW.created_at)
       IS DISTINCT FROM (OLD.id, OLD.tipo_constancia, OLD.concepto, OLD.monto, OLD.version, OLD.publicada, OLD.vigente_desde, OLD.created_at) THEN
    RAISE EXCEPTION 'La tarifa publicada es inmutable; cree una nueva version';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_version_catalogo_inmutable BEFORE UPDATE OR DELETE ON version_catalogo FOR EACH ROW EXECUTE FUNCTION fn_version_catalogo_inmutable();
CREATE TRIGGER trg_grupo_requisito_inmutable BEFORE INSERT OR UPDATE OR DELETE ON grupo_requisito FOR EACH ROW EXECUTE FUNCTION fn_grupo_requisito_inmutable();
CREATE TRIGGER trg_opcion_requisito_inmutable BEFORE INSERT OR UPDATE OR DELETE ON opcion_requisito FOR EACH ROW EXECUTE FUNCTION fn_opcion_requisito_inmutable();
CREATE TRIGGER trg_opcion_documento_inmutable BEFORE INSERT OR UPDATE OR DELETE ON opcion_documento FOR EACH ROW EXECUTE FUNCTION fn_opcion_documento_inmutable();
CREATE TRIGGER trg_tarifa_inmutable BEFORE UPDATE OR DELETE ON tarifa FOR EACH ROW EXECUTE FUNCTION fn_tarifa_inmutable();

CREATE OR REPLACE FUNCTION fn_configuracion_plazos_integridad()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'La configuracion de plazos se conserva; desactivela en lugar de eliminarla';
  END IF;
  PERFORM fn_contexto_exige_actor(NEW.actualizado_por_id);
  PERFORM fn_contexto_exige_rol('ti');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_configuracion_plazos_integridad
  BEFORE INSERT OR UPDATE OR DELETE ON configuracion_plazos
  FOR EACH ROW EXECUTE FUNCTION fn_configuracion_plazos_integridad();

CREATE OR REPLACE FUNCTION fn_borrador_cobro_integridad()
RETURNS trigger AS $$
DECLARE
  estado_tramite "EstadoTramite";
  fecha_limite timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los borradores de cobro se conservan para auditoria';
  END IF;

  SELECT estado, plazo_pago_hasta INTO estado_tramite, fecha_limite
  FROM tramite WHERE id = NEW.tramite_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El tramite del borrador no existe'; END IF;
  -- Las transiciones automáticas a VENCIDO/CANCELADO provienen del trigger
  -- del trámite; no representan una nueva acción humana.
  IF NOT (TG_OP = 'UPDATE' AND NEW.estado IN ('VENCIDO', 'CANCELADO') AND pg_trigger_depth() > 1) THEN
    IF TG_OP = 'INSERT' THEN PERFORM fn_contexto_exige_actor(NEW.creado_por_id); END IF;
    PERFORM fn_contexto_exige_actor(NEW.actualizado_por_id);
    PERFORM fn_contexto_exige_rol('ventanilla');
  END IF;

  IF TG_OP = 'INSERT' AND NEW.estado <> 'ABIERTO' THEN
    RAISE EXCEPTION 'Un borrador nuevo debe iniciar en ABIERTO';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado <> 'ABIERTO' THEN
    RAISE EXCEPTION 'Un borrador % no puede modificarse', OLD.estado;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id THEN
    RAISE EXCEPTION 'El creador de un borrador no puede modificarse';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado = 'ABIERTO'
     AND NEW.estado NOT IN ('ABIERTO', 'APLICADO', 'VENCIDO', 'CANCELADO') THEN
    RAISE EXCEPTION 'Transicion de borrador no permitida: % -> %', OLD.estado, NEW.estado;
  END IF;

  IF NEW.estado = 'ABIERTO' THEN
    IF estado_tramite <> 'APROBADO' THEN
      RAISE EXCEPTION 'Solo se guarda un borrador en un tramite APROBADO';
    END IF;
    IF fecha_limite IS NULL OR now() > fecha_limite THEN
      RAISE EXCEPTION 'No se guarda ni modifica un borrador despues del vencimiento de pago';
    END IF;
    IF EXISTS (SELECT 1 FROM cobro WHERE tramite_id = NEW.tramite_id) THEN
      RAISE EXCEPTION 'No se crea un borrador cuando el tramite ya tiene cobro definitivo';
    END IF;
    IF NEW.cobro_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un borrador ABIERTO no puede referir un cobro definitivo';
    END IF;
  END IF;

  IF NEW.estado = 'APLICADO' THEN
    IF estado_tramite <> 'APROBADO' OR fecha_limite IS NULL OR now() > fecha_limite THEN
      RAISE EXCEPTION 'No se puede aplicar un borrador fuera del plazo de pago vigente';
    END IF;
    IF NEW.tarifa_id IS NULL OR NEW.monto_base IS NULL OR NEW.porcentaje_reduccion IS NULL
       OR NEW.monto_final IS NULL OR NEW.forma_pago IS NULL OR NEW.metodo_pago IS NULL
       OR NEW.moneda IS NULL OR NEW.requiere_factura IS NULL OR NEW.cobro_id IS NULL THEN
      RAISE EXCEPTION 'Un borrador aplicado requiere todos los datos de cobro y su cobro definitivo';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM cobro c
      WHERE c.id = NEW.cobro_id AND c.tramite_id = NEW.tramite_id
        AND c.tarifa_id = NEW.tarifa_id AND c.monto_base = NEW.monto_base
        AND c.porcentaje_reduccion = NEW.porcentaje_reduccion AND c.monto_final = NEW.monto_final
        AND c.forma_pago = NEW.forma_pago AND c.metodo_pago = NEW.metodo_pago
        AND c.moneda = NEW.moneda AND c.requiere_factura = NEW.requiere_factura
        AND c.referencia_pago IS NOT DISTINCT FROM NEW.referencia_pago
    ) THEN
      RAISE EXCEPTION 'El cobro definitivo no coincide con los datos del borrador aplicado';
    END IF;
    IF NEW.aplicado_at IS NULL THEN NEW.aplicado_at := now(); END IF;
  END IF;
  IF NEW.estado = 'VENCIDO' THEN
    IF fecha_limite IS NULL OR now() <= fecha_limite THEN
      RAISE EXCEPTION 'Un borrador solo puede vencer despues del plazo de pago';
    END IF;
    IF NEW.vencido_at IS NULL THEN NEW.vencido_at := now(); END IF;
  END IF;
  IF NEW.estado = 'CANCELADO' THEN
    -- Durante el BEFORE UPDATE del trámite la fila aún conserva APROBADO;
    -- pg_trigger_depth() > 1 identifica la cancelación anidada de ese flujo.
    IF estado_tramite <> 'RECHAZADO' AND pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION 'Un borrador solo se cancela cuando el tramite es rechazado';
    END IF;
    IF NEW.cancelado_at IS NULL THEN NEW.cancelado_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_borrador_cobro_integridad
  BEFORE INSERT OR UPDATE OR DELETE ON borrador_cobro
  FOR EACH ROW EXECUTE FUNCTION fn_borrador_cobro_integridad();

CREATE OR REPLACE FUNCTION fn_solicitud_factura_integridad()
RETURNS trigger AS $$
DECLARE
  plazo_factura_dias integer;
  emitida_at_constancia timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Las solicitudes de factura se conservan para auditoria';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'PENDIENTE_REVISION' THEN
      RAISE EXCEPTION 'Una solicitud nueva debe iniciar en PENDIENTE_REVISION';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM configuracion_plazos WHERE id = 'PLAZOS_OPERATIVOS' AND activa) THEN
      RAISE EXCEPTION 'No se reciben solicitudes sin configuracion de plazos activa';
    END IF;
    SELECT cp.plazo_solicitud_factura_dias, co.emitida_at
      INTO plazo_factura_dias, emitida_at_constancia
    FROM configuracion_plazos cp
    CROSS JOIN cobro c
    JOIN tramite t ON t.id = c.tramite_id
    JOIN constancia co ON co.tramite_id = t.id
    WHERE cp.id = 'PLAZOS_OPERATIVOS' AND cp.activa AND c.id = NEW.cobro_id;
    IF plazo_factura_dias IS NULL OR emitida_at_constancia IS NULL THEN
      RAISE EXCEPTION 'Solo se solicita factura para una constancia emitida con configuracion activa';
    END IF;
    NEW.fecha_limite := emitida_at_constancia + make_interval(days => plazo_factura_dias);
    IF NEW.solicitada_at > NEW.fecha_limite THEN
      RAISE EXCEPTION 'La solicitud de factura excede el plazo aplicable';
    END IF;
    IF EXISTS (SELECT 1 FROM factura WHERE cobro_id = NEW.cobro_id)
       OR EXISTS (SELECT 1 FROM factura_global_detalle WHERE cobro_id = NEW.cobro_id) THEN
      RAISE EXCEPTION 'El cobro ya no es elegible para una solicitud de factura individual';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.estado <> 'PENDIENTE_REVISION' THEN
    RAISE EXCEPTION 'Una solicitud resuelta no puede modificarse';
  END IF;
  IF (NEW.cobro_id, NEW.receptor_rfc, NEW.receptor_nombre, NEW.receptor_cp,
      NEW.receptor_regimen, NEW.uso_cfdi, NEW.fecha_limite, NEW.solicitada_at)
     IS DISTINCT FROM (OLD.cobro_id, OLD.receptor_rfc, OLD.receptor_nombre, OLD.receptor_cp,
                       OLD.receptor_regimen, OLD.uso_cfdi, OLD.fecha_limite, OLD.solicitada_at) THEN
    RAISE EXCEPTION 'Los datos fiscales de una solicitud no se modifican; genere una nueva solicitud';
  END IF;
  IF NEW.estado NOT IN ('ACEPTADA', 'RECHAZADA') THEN
    RAISE EXCEPTION 'La solicitud pendiente solo puede aceptarse o rechazarse';
  END IF;
  PERFORM fn_contexto_exige_actor(NEW.resuelta_por_id);
  PERFORM fn_contexto_exige_rol('finanzas');
  IF NEW.resuelta_at IS NULL THEN RAISE EXCEPTION 'La resolución requiere fecha'; END IF;
  IF NEW.estado = 'ACEPTADA' THEN
    IF NEW.factura_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM factura f JOIN cobro c ON c.id = f.cobro_id
      WHERE f.id = NEW.factura_id AND c.id = NEW.cobro_id AND c.requiere_factura
        AND NOT EXISTS (SELECT 1 FROM factura_global_detalle gd WHERE gd.cobro_id = c.id)
    ) THEN RAISE EXCEPTION 'Una solicitud aceptada requiere factura individual compatible'; END IF;
  ELSIF NEW.factura_id IS NOT NULL OR NEW.motivo_rechazo IS NULL THEN
    RAISE EXCEPTION 'Una solicitud rechazada requiere motivo y no puede tener factura';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_solicitud_factura_integridad
  BEFORE INSERT OR UPDATE OR DELETE ON solicitud_factura
  FOR EACH ROW EXECUTE FUNCTION fn_solicitud_factura_integridad();

CREATE OR REPLACE FUNCTION fn_evidencia_integridad()
RETURNS trigger AS $$
DECLARE total bigint;
BEGIN
  PERFORM 1 FROM tramite WHERE id = NEW.tramite_id FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM opcion_documento d
    JOIN opcion_requisito o ON o.id = d.opcion_id
    JOIN grupo_requisito g ON g.id = o.grupo_id
    JOIN tramite t ON t.id = NEW.tramite_id
    WHERE d.id = NEW.opcion_documento_id AND g.version_catalogo_id = t.version_catalogo_id
  ) THEN RAISE EXCEPTION 'El documento de evidencia no pertenece al catalogo estampado del tramite'; END IF;
  SELECT COALESCE(sum(tamano_bytes), 0) INTO total FROM evidencia
    WHERE tramite_id = NEW.tramite_id AND (TG_OP = 'INSERT' OR id <> OLD.id);
  IF total + NEW.tamano_bytes > 31457280 THEN RAISE EXCEPTION 'El tramite excede el limite acumulado de 30 MB'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_evidencia_integridad BEFORE INSERT OR UPDATE ON evidencia FOR EACH ROW EXECUTE FUNCTION fn_evidencia_integridad();

CREATE OR REPLACE FUNCTION fn_checklist_satisfecho(p_tramite_id uuid)
RETURNS boolean AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM grupo_requisito g JOIN tramite t ON t.id = p_tramite_id
    WHERE g.version_catalogo_id = t.version_catalogo_id
      AND (g.aplica_tipo IS NULL OR g.aplica_tipo = t.tipo_constancia)
      AND (g.aplica_personalidad IS NULL OR g.aplica_personalidad = t.personalidad)
      AND (g.aplica_representacion IS NULL OR g.aplica_representacion = t.representacion)
      AND NOT EXISTS (
        SELECT 1 FROM opcion_requisito o WHERE o.grupo_id = g.id AND NOT EXISTS (
          SELECT 1 FROM opcion_documento d WHERE d.opcion_id = o.id AND NOT EXISTS (
            SELECT 1 FROM evidencia e WHERE e.tramite_id = t.id AND e.opcion_documento_id = d.id AND e.estado = 'VALIDADO'
          )
        )
      )
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION fn_tramite_transicion_valida()
RETURNS trigger AS $$
DECLARE v_requiere_factura boolean; v_plazo_pago_dias integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'CAPTURA' THEN RAISE EXCEPTION 'Un tramite nuevo debe iniciar en CAPTURA'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.estado = OLD.estado THEN RETURN NEW; END IF;
  IF NOT ((OLD.estado = 'CAPTURA' AND NEW.estado = 'EN_VALIDACION') OR
          (OLD.estado = 'EN_VALIDACION' AND NEW.estado IN ('APROBADO','RECHAZADO')) OR
          (OLD.estado = 'APROBADO' AND NEW.estado IN ('COBRO','RECHAZADO','EXPIRADO')) OR
          (OLD.estado = 'COBRO' AND NEW.estado = 'FINALIZADO')) THEN
    RAISE EXCEPTION 'Transicion de tramite no permitida: % -> %', OLD.estado, NEW.estado;
  END IF;
  IF OLD.estado = 'CAPTURA' AND NEW.estado = 'EN_VALIDACION' AND NOT fn_checklist_satisfecho(NEW.id) THEN
    RAISE EXCEPTION 'No se puede iniciar validacion: faltan requisitos aplicables';
  END IF;
  IF OLD.estado = 'EN_VALIDACION' AND NEW.estado = 'APROBADO' AND NEW.tipo_constancia = 'NO_ADEUDO'
     AND NOT EXISTS (SELECT 1 FROM validacion_no_adeudo WHERE tramite_id = NEW.id AND momento = 'VALIDACION_INICIAL' AND resultado = 'SIN_ADEUDO') THEN
    RAISE EXCEPTION 'No se puede aprobar sin validacion inicial SIN_ADEUDO';
  END IF;
  IF OLD.estado = 'EN_VALIDACION' AND NEW.estado = 'APROBADO' THEN
    SELECT plazo_pago_dias INTO v_plazo_pago_dias
    FROM configuracion_plazos WHERE id = 'PLAZOS_OPERATIVOS' AND activa;
    IF v_plazo_pago_dias IS NULL OR v_plazo_pago_dias <= 0 THEN
      RAISE EXCEPTION 'No se puede aprobar sin configuracion activa de plazo de pago';
    END IF;
    NEW.plazo_pago_hasta := now() + make_interval(days => v_plazo_pago_dias);
  END IF;
  IF OLD.estado = 'APROBADO' AND NEW.estado = 'COBRO' THEN
    IF NEW.plazo_pago_hasta IS NULL OR now() > NEW.plazo_pago_hasta THEN
      RAISE EXCEPTION 'No se puede cobrar despues del plazo de pago';
    END IF;
    IF NEW.tipo_constancia = 'NO_ADEUDO' AND NOT EXISTS (SELECT 1 FROM validacion_no_adeudo WHERE tramite_id = NEW.id AND momento = 'REVALIDACION_COBRO' AND resultado = 'SIN_ADEUDO') THEN RAISE EXCEPTION 'No se puede cobrar sin revalidacion SIN_ADEUDO'; END IF;
    IF NOT EXISTS (SELECT 1 FROM cobro c JOIN tarifa ta ON ta.id = c.tarifa_id WHERE c.tramite_id = NEW.id AND ta.publicada AND ta.activa AND ta.tipo_constancia = NEW.tipo_constancia) THEN RAISE EXCEPTION 'No existe un cobro valido con tarifa activa compatible'; END IF;
  END IF;
  IF OLD.estado = 'APROBADO' AND NEW.estado = 'EXPIRADO' THEN
    IF NEW.plazo_pago_hasta IS NULL OR now() <= NEW.plazo_pago_hasta THEN
      RAISE EXCEPTION 'No se puede expirar antes del vencimiento del plazo de pago';
    END IF;
    UPDATE borrador_cobro SET estado = 'VENCIDO', vencido_at = now()
      WHERE tramite_id = NEW.id AND estado = 'ABIERTO';
  END IF;
  IF OLD.estado = 'APROBADO' AND NEW.estado = 'RECHAZADO' THEN
    UPDATE borrador_cobro SET estado = 'CANCELADO', cancelado_at = now()
      WHERE tramite_id = NEW.id AND estado = 'ABIERTO';
  END IF;
  IF OLD.estado = 'COBRO' AND NEW.estado = 'FINALIZADO' THEN
    IF NOT EXISTS (SELECT 1 FROM constancia WHERE tramite_id = NEW.id) THEN RAISE EXCEPTION 'No se puede finalizar sin constancia emitida'; END IF;
    SELECT requiere_factura INTO v_requiere_factura FROM cobro WHERE tramite_id = NEW.id;
    IF v_requiere_factura AND NOT EXISTS (SELECT 1 FROM cobro c JOIN factura f ON f.cobro_id = c.id WHERE c.tramite_id = NEW.id AND f.estado = 'TIMBRADO') THEN RAISE EXCEPTION 'No se puede finalizar sin factura timbrada'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_tramite_transicion_valida BEFORE INSERT OR UPDATE OF estado ON tramite FOR EACH ROW EXECUTE FUNCTION fn_tramite_transicion_valida();

CREATE OR REPLACE FUNCTION fn_cobro_integridad()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_contexto_exige_actor(NEW.cobrado_por_id);
  PERFORM fn_contexto_exige_rol('ventanilla');
  IF TG_OP = 'INSERT' AND NOT EXISTS (
      SELECT 1 FROM tramite t JOIN tarifa ta ON ta.id = NEW.tarifa_id
      WHERE t.id = NEW.tramite_id AND t.estado = 'APROBADO'
        AND t.plazo_pago_hasta IS NOT NULL AND now() <= t.plazo_pago_hasta
        AND ta.publicada AND ta.activa AND ta.tipo_constancia = t.tipo_constancia
  ) THEN
    RAISE EXCEPTION 'El cobro requiere tramite APROBADO vigente y tarifa activa compatible';
  END IF;
  IF TG_OP = 'UPDATE' AND
     (NEW.tramite_id, NEW.tarifa_id, NEW.monto_base, NEW.porcentaje_reduccion,
      NEW.monto_final, NEW.forma_pago, NEW.metodo_pago, NEW.moneda,
      NEW.referencia_pago, NEW.cobrado_por_id, NEW.cobrado_at)
     IS DISTINCT FROM
     (OLD.tramite_id, OLD.tarifa_id, OLD.monto_base, OLD.porcentaje_reduccion,
      OLD.monto_final, OLD.forma_pago, OLD.metodo_pago, OLD.moneda,
      OLD.referencia_pago, OLD.cobrado_por_id, OLD.cobrado_at) THEN
    RAISE EXCEPTION 'Los campos canonicos del cobro definitivo son inmutables';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.requiere_factura AND NOT NEW.requiere_factura THEN
    RAISE EXCEPTION 'Un cobro que requiere factura no puede volver a publico en general';
  END IF;
  IF NOT NEW.requiere_factura AND EXISTS (SELECT 1 FROM factura WHERE cobro_id = NEW.id) THEN
    RAISE EXCEPTION 'Un cobro de publico en general no puede tener factura individual';
  END IF;
  IF NEW.requiere_factura AND EXISTS (SELECT 1 FROM factura_global_detalle WHERE cobro_id = NEW.id) THEN
    RAISE EXCEPTION 'Un cobro que requiere factura no puede pertenecer a una factura global';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cobro_integridad BEFORE INSERT OR UPDATE ON cobro FOR EACH ROW EXECUTE FUNCTION fn_cobro_integridad();

CREATE OR REPLACE FUNCTION fn_factura_integridad()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado <> 'PENDIENTE' THEN
    RAISE EXCEPTION 'Una factura nueva debe iniciar en PENDIENTE';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.estado <> OLD.estado AND NOT (
    (OLD.estado = 'PENDIENTE' AND NEW.estado = 'TIMBRADO_EN_PROCESO') OR
    (OLD.estado = 'TIMBRADO_EN_PROCESO' AND NEW.estado IN ('TIMBRADO', 'TIMBRADO_FALLIDO')) OR
    (OLD.estado = 'TIMBRADO_FALLIDO' AND NEW.estado = 'TIMBRADO_EN_PROCESO') OR
    (OLD.estado = 'TIMBRADO' AND NEW.estado = 'CANCELADO')
  ) THEN
    RAISE EXCEPTION 'Transicion de factura no permitida: % -> %', OLD.estado, NEW.estado;
  END IF;
  IF TG_TABLE_NAME = 'factura' AND NEW.estado IN ('TIMBRADO_EN_PROCESO', 'TIMBRADO') AND
     (NEW.receptor_rfc IS NULL OR btrim(NEW.receptor_rfc) = ''
      OR NEW.receptor_nombre IS NULL OR btrim(NEW.receptor_nombre) = ''
      OR NEW.receptor_cp IS NULL OR btrim(NEW.receptor_cp) = ''
      OR NEW.receptor_regimen IS NULL OR btrim(NEW.receptor_regimen) = ''
      OR NEW.uso_cfdi IS NULL OR btrim(NEW.uso_cfdi) = '') THEN
    RAISE EXCEPTION 'La factura individual requiere datos fiscales completos antes del timbrado';
  END IF;
  IF TG_TABLE_NAME = 'factura' AND NOT EXISTS (SELECT 1 FROM cobro WHERE id = NEW.cobro_id AND requiere_factura) THEN
    RAISE EXCEPTION 'La factura individual solo aplica a cobros que requieren factura';
  END IF;
  IF NEW.estado = 'TIMBRADO' AND (NEW.uuid IS NULL
     OR NOT EXISTS (SELECT 1 FROM archivo_generado WHERE (factura_id = NEW.id OR factura_global_id = NEW.id) AND tipo = 'XML')
     OR NOT EXISTS (SELECT 1 FROM archivo_generado WHERE (factura_id = NEW.id OR factura_global_id = NEW.id) AND tipo = 'PDF')) THEN
    RAISE EXCEPTION 'Un CFDI timbrado requiere UUID, XML y PDF inmutables';
  END IF;
  IF NEW.estado = 'CANCELADO' AND (NEW.motivo_cancelacion IS NULL OR NEW.uuid_sustituto IS NULL) THEN
    RAISE EXCEPTION 'La cancelacion requiere motivo y UUID sustituto';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_factura_integridad BEFORE INSERT OR UPDATE ON factura FOR EACH ROW EXECUTE FUNCTION fn_factura_integridad();
CREATE TRIGGER trg_factura_global_integridad BEFORE INSERT OR UPDATE ON factura_global FOR EACH ROW EXECUTE FUNCTION fn_factura_integridad();

CREATE OR REPLACE FUNCTION fn_factura_global_detalle_integridad()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cobro WHERE id = NEW.cobro_id AND NOT requiere_factura) THEN
    RAISE EXCEPTION 'Una factura global solo puede incluir cobros de publico en general';
  END IF;
  IF EXISTS (SELECT 1 FROM factura WHERE cobro_id = NEW.cobro_id) THEN
    RAISE EXCEPTION 'Un cobro no puede pertenecer a una factura individual y a una global';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_factura_global_detalle_integridad BEFORE INSERT OR UPDATE ON factura_global_detalle FOR EACH ROW EXECUTE FUNCTION fn_factura_global_detalle_integridad();

CREATE OR REPLACE FUNCTION fn_archivo_generado_inmutable()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Los archivos generados se conservan; use estado de conservacion'; END IF;
  IF OLD.id IS NOT NULL AND (NEW.constancia_id, NEW.factura_id, NEW.factura_global_id, NEW.tipo, NEW.archivo_uuid, NEW.ruta, NEW.hash_sha256, NEW.mime_type, NEW.tamano_bytes)
     IS DISTINCT FROM (OLD.constancia_id, OLD.factura_id, OLD.factura_global_id, OLD.tipo, OLD.archivo_uuid, OLD.ruta, OLD.hash_sha256, OLD.mime_type, OLD.tamano_bytes) THEN
    RAISE EXCEPTION 'Los metadatos canonicos de un archivo generado son inmutables';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_archivo_generado_inmutable BEFORE UPDATE OR DELETE ON archivo_generado FOR EACH ROW EXECUTE FUNCTION fn_archivo_generado_inmutable();

CREATE OR REPLACE FUNCTION fn_constancia_inmutable()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'La constancia emitida no se elimina'; END IF;
  -- hash_contenido y version_token entran aquí a propósito: son el ancla de la
  -- verificación pública por QR y deben ser tan inmutables como el folio.
  IF (NEW.id, NEW.tramite_id, NEW.folio_unico, NEW.hash_pdf, NEW.hash_contenido, NEW.version_token, NEW.archivo_uuid, NEW.firma_digital, NEW.certificado_id, NEW.emitida_at, NEW.vigencia_inicio, NEW.vigencia_fin)
     IS DISTINCT FROM (OLD.id, OLD.tramite_id, OLD.folio_unico, OLD.hash_pdf, OLD.hash_contenido, OLD.version_token, OLD.archivo_uuid, OLD.firma_digital, OLD.certificado_id, OLD.emitida_at, OLD.vigencia_inicio, OLD.vigencia_fin) THEN
    RAISE EXCEPTION 'Los campos canonicos de la constancia emitida son inmutables';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_constancia_inmutable BEFORE UPDATE OR DELETE ON constancia FOR EACH ROW EXECUTE FUNCTION fn_constancia_inmutable();

CREATE OR REPLACE FUNCTION fn_bitacora_protegida()
RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'La bitacora es append-only'; END IF;
  IF NEW.origen = 'USUARIO' THEN
    IF NEW.actor_id IS NULL OR NEW.roles_snapshot IS NULL OR NEW.ip_address IS NULL OR NEW.user_agent IS NULL OR NEW.request_id IS NULL THEN
      RAISE EXCEPTION 'La bitacora de usuario requiere actor, roles, IP, user-agent y request_id';
    END IF;
    IF jsonb_typeof(NEW.roles_snapshot) <> 'array' OR jsonb_array_length(NEW.roles_snapshot) = 0 THEN
      RAISE EXCEPTION 'roles_snapshot debe ser un arreglo JSON no vacío';
    END IF;
    PERFORM fn_contexto_exige_actor(NEW.actor_id);
    IF NEW.roles_snapshot IS DISTINCT FROM fn_contexto_roles() THEN
      RAISE EXCEPTION 'roles_snapshot debe coincidir exactamente con app.roles';
    END IF;
  END IF;
  IF NEW.origen = 'PORTAL' AND (NEW.actor_id IS NOT NULL OR NEW.ip_address IS NULL OR NEW.user_agent IS NULL OR NEW.request_id IS NULL) THEN
    RAISE EXCEPTION 'La bitacora de portal requiere IP, user-agent y request_id, sin actor interno';
  END IF;
  IF NEW.origen = 'WORKER' AND NEW.request_id IS NULL AND NEW.job_id IS NULL THEN RAISE EXCEPTION 'La bitacora de worker requiere request_id o job_id'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_bitacora_protegida BEFORE INSERT OR UPDATE OR DELETE ON bitacora FOR EACH ROW EXECUTE FUNCTION fn_bitacora_protegida();

CREATE OR REPLACE FUNCTION fn_sin_borrado_historico()
RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'No se permite borrar %; use anulacion o cancelacion', TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_tramite_sin_borrado BEFORE DELETE ON tramite FOR EACH ROW EXECUTE FUNCTION fn_sin_borrado_historico();
CREATE TRIGGER trg_cobro_sin_borrado BEFORE DELETE ON cobro FOR EACH ROW EXECUTE FUNCTION fn_sin_borrado_historico();
CREATE TRIGGER trg_factura_sin_borrado BEFORE DELETE ON factura FOR EACH ROW EXECUTE FUNCTION fn_sin_borrado_historico();
CREATE TRIGGER trg_factura_global_sin_borrado BEFORE DELETE ON factura_global FOR EACH ROW EXECUTE FUNCTION fn_sin_borrado_historico();
CREATE TRIGGER trg_evidencia_sin_borrado BEFORE DELETE ON evidencia FOR EACH ROW EXECUTE FUNCTION fn_sin_borrado_historico();

-- Defensa adicional cuando la cuenta limitada de runtime existe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sicef_app') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE bitacora FROM sicef_app';
  END IF;
END;
$$;
