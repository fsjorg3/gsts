-- SICEF · verificación de integridad de la base.
--
-- Ejercita en runtime las reglas que instala migration_complementaria.sql.
-- Existe porque PostgreSQL NO valida los nombres de columna dentro del cuerpo
-- de una función plpgsql al crearla: `CREATE FUNCTION` reporta éxito aunque el
-- cuerpo referencie columnas inexistentes, y el error sólo aparece la primera
-- vez que el trigger se dispara. Instalar la capa de reglas sin errores no
-- prueba, por sí solo, que las reglas funcionen.
--
--   psql "$DIRECT_DATABASE_URL" -v ON_ERROR_STOP=1 -f verificacion_integridad.sql
--
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: la base queda
-- exactamente como estaba. Puede correrse sobre una base con datos.
--
-- Cada caso se registra por separado; al final se imprime la lista de fallas.
-- Un caso "negativo" comprueba que la base RECHACE algo; si lo acepta, falla.

\set ON_ERROR_STOP on

-- Cada caso se invoca con SELECT y devolvería una fila vacía; se silencian
-- hasta el informe final. Conviene además correr psql con -q.
\pset tuples_only on
\pset format unaligned

BEGIN;

-- ---------------------------------------------------------------- andamiaje

CREATE TEMP TABLE verificacion (
  n       serial PRIMARY KEY,
  caso    text,
  ok      boolean,
  detalle text
);

-- Fija el contexto transaccional igual que withBusinessTransaction en el
-- backend. Sin bloque EXCEPTION a propósito: así los set_config viven en la
-- transacción externa y no se deshacen con la subtransacción de cada caso.
CREATE FUNCTION pg_temp.contexto(p_actor text, p_roles text) RETURNS void AS $fn$
BEGIN
  PERFORM set_config('app.actor_id', p_actor, true);
  PERFORM set_config('app.roles', p_roles, true);
  PERFORM set_config('app.request_id', '99999999-9999-9999-9999-999999999999', true);
END;
$fn$ LANGUAGE plpgsql;

-- El bloque EXCEPTION abre una subtransacción: cuando la acción es rechazada,
-- su efecto se deshace y el caso siguiente arranca limpio.
CREATE FUNCTION pg_temp.debe_pasar(p_caso text, p_sql text) RETURNS void AS $fn$
BEGIN
  EXECUTE p_sql;
  INSERT INTO pg_temp.verificacion(caso, ok, detalle) VALUES (p_caso, true, 'aceptado');
EXCEPTION WHEN others THEN
  INSERT INTO pg_temp.verificacion(caso, ok, detalle) VALUES (p_caso, false, 'RECHAZADO: ' || SQLERRM);
END;
$fn$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp.debe_fallar(p_caso text, p_sql text) RETURNS void AS $fn$
BEGIN
  EXECUTE p_sql;
  -- Llegar aquí significa que la guardia no disparó. La excepción deshace el
  -- efecto para no contaminar los casos siguientes.
  RAISE EXCEPTION 'XFAIL';
EXCEPTION WHEN others THEN
  IF SQLERRM = 'XFAIL' THEN
    INSERT INTO pg_temp.verificacion(caso, ok, detalle)
      VALUES (p_caso, false, 'ACEPTADO y debía rechazarse');
  ELSE
    INSERT INTO pg_temp.verificacion(caso, ok, detalle) VALUES (p_caso, true, SQLERRM);
  END IF;
END;
$fn$ LANGUAGE plpgsql;

-- Variante con contexto propio, para las guardias de actor/rol. El set_config
-- va dentro del bloque EXCEPTION: al abortar la subtransacción, PostgreSQL
-- restaura el valor anterior del GUC.
CREATE FUNCTION pg_temp.debe_fallar_ctx(p_caso text, p_actor text, p_roles text, p_sql text)
RETURNS void AS $fn$
BEGIN
  PERFORM set_config('app.actor_id', p_actor, true);
  PERFORM set_config('app.roles', p_roles, true);
  EXECUTE p_sql;
  RAISE EXCEPTION 'XFAIL';
EXCEPTION WHEN others THEN
  IF SQLERRM = 'XFAIL' THEN
    INSERT INTO pg_temp.verificacion(caso, ok, detalle)
      VALUES (p_caso, false, 'ACEPTADO y debía rechazarse');
  ELSE
    INSERT INTO pg_temp.verificacion(caso, ok, detalle) VALUES (p_caso, true, SQLERRM);
  END IF;
END;
$fn$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp.afirmar(p_caso text, p_cond boolean, p_detalle text) RETURNS void AS $fn$
BEGIN
  INSERT INTO pg_temp.verificacion(caso, ok, detalle)
    VALUES (p_caso, COALESCE(p_cond, false), p_detalle);
END;
$fn$ LANGUAGE plpgsql;


-- =====================================================================
-- I · Regresión: la facturación ya no existe
-- =====================================================================

SELECT pg_temp.afirmar('I.1 · tablas fiscales ausentes',
  to_regclass('public.factura') IS NULL
  AND to_regclass('public.solicitud_factura') IS NULL
  AND to_regclass('public.factura_global') IS NULL
  AND to_regclass('public.factura_global_detalle') IS NULL,
  'factura, solicitud_factura, factura_global, factura_global_detalle');

SELECT pg_temp.afirmar('I.2 · enums fiscales ausentes',
  NOT EXISTS (SELECT 1 FROM pg_type WHERE typname IN ('EstadoFactura','EstadoSolicitudFactura')),
  'EstadoFactura, EstadoSolicitudFactura');

SELECT pg_temp.afirmar('I.3 · columna renombrada en cobro y borrador_cobro',
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND column_name='factura_solicitada_en_ventanilla') = 2
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND column_name='requiere_factura'),
  'cobro y borrador_cobro');

SELECT pg_temp.afirmar('I.4 · configuracion_plazos sin plazo fiscal',
  NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='configuracion_plazos' AND column_name='plazo_solicitud_factura_dias'),
  'plazo_solicitud_factura_dias');

SELECT pg_temp.afirmar('I.5 · archivo_generado cuelga sólo de constancia',
  (SELECT is_nullable FROM information_schema.columns
     WHERE table_name='archivo_generado' AND column_name='constancia_id') = 'NO'
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_name='archivo_generado' AND column_name IN ('factura_id','factura_global_id')),
  'constancia_id NOT NULL, sin factura_id ni factura_global_id');


-- =====================================================================
-- A · Semilla: catálogo, tarifas, plazos, personas
-- =====================================================================

SELECT pg_temp.contexto('11111111-1111-1111-1111-111111111111', '["ti"]');

INSERT INTO actor (id, keycloak_sub) VALUES
  ('11111111-1111-1111-1111-111111111111', 'verificacion-ti'),
  ('22222222-2222-2222-2222-222222222222', 'verificacion-ventanilla');

INSERT INTO persona (id, tipo, nombre_razon_social) VALUES
  ('55555555-5555-5555-5555-555555555555', 'FISICA', 'Persona de verificación');

-- Catálogo vigente, aún sin publicar.
INSERT INTO version_catalogo (id, version) VALUES
  ('33333333-3333-3333-3333-333333333333', 900);

SELECT pg_temp.debe_pasar('A.1 · estructura en catálogo NO publicado', $q$
  INSERT INTO grupo_requisito (id, version_catalogo_id, clave, nombre)
    VALUES ('33333333-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','G','Grupo');
  $q$);
INSERT INTO opcion_requisito (id, grupo_id, clave, nombre)
  VALUES ('33333333-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000001','O','Opcion');
INSERT INTO opcion_documento (id, opcion_id, nombre)
  VALUES ('33333333-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000002','Documento');

SELECT pg_temp.debe_pasar('A.2 · publicar y activar el catálogo', $q$
  UPDATE version_catalogo SET publicada = true, activa = true, vigente_desde = now()
   WHERE id = '33333333-3333-3333-3333-333333333333';
  $q$);

-- Catálogo ajeno: nunca se publica ni se activa. Sirve para comprobar que una
-- evidencia no puede colgar de un documento fuera del catálogo estampado.
INSERT INTO version_catalogo (id, version) VALUES
  ('33333333-3333-3333-3333-333333333334', 901);
INSERT INTO grupo_requisito (id, version_catalogo_id, clave, nombre)
  VALUES ('33333333-0000-0000-0000-000000000011','33333333-3333-3333-3333-333333333334','G2','Grupo ajeno');
INSERT INTO opcion_requisito (id, grupo_id, clave, nombre)
  VALUES ('33333333-0000-0000-0000-000000000012','33333333-0000-0000-0000-000000000011','O2','Opcion ajena');
INSERT INTO opcion_documento (id, opcion_id, nombre)
  VALUES ('33333333-0000-0000-0000-000000000013','33333333-0000-0000-0000-000000000012','Documento ajeno');

INSERT INTO tarifa (id, tipo_constancia, concepto, monto, version, publicada, activa, vigente_desde) VALUES
  ('44444444-4444-4444-4444-444444444441','NO_REGISTRO','Constancia de no registro', 350.00, 900, true, true, now()),
  ('44444444-4444-4444-4444-444444444442','NO_ADEUDO','Constancia de no adeudo',    420.00, 900, true, true, now());

INSERT INTO configuracion_plazos (id, plazo_pago_dias, activa, actualizado_por_id, updated_at)
  VALUES ('PLAZOS_OPERATIVOS', 5, true, '11111111-1111-1111-1111-111111111111', now());

-- Guardias de catálogo publicado.
SELECT pg_temp.debe_fallar('A.3 · no se agrega estructura a catálogo publicado', $q$
  INSERT INTO grupo_requisito (id, version_catalogo_id, clave, nombre)
    VALUES ('33333333-0000-0000-0000-0000000000ff','33333333-3333-3333-3333-333333333333','GX','Tardío');
  $q$);

SELECT pg_temp.debe_fallar('A.4 · no se altera la versión de un catálogo publicado', $q$
  UPDATE version_catalogo SET version = 999 WHERE id = '33333333-3333-3333-3333-333333333333';
  $q$);

SELECT pg_temp.debe_pasar('A.5 · sí se puede cerrar la vigencia de un catálogo publicado', $q$
  UPDATE version_catalogo SET vigente_hasta = now() + interval '1 year'
   WHERE id = '33333333-3333-3333-3333-333333333333';
  $q$);

SELECT pg_temp.debe_fallar('A.6 · la tarifa publicada es inmutable', $q$
  UPDATE tarifa SET monto = 1.00 WHERE id = '44444444-4444-4444-4444-444444444441';
  $q$);

SELECT pg_temp.debe_fallar('A.7 · una sola tarifa activa por tipo y concepto', $q$
  INSERT INTO tarifa (id, tipo_constancia, concepto, monto, version, publicada, activa)
    VALUES ('44444444-4444-4444-4444-4444444444ff','NO_REGISTRO','Constancia de no registro', 400.00, 901, true, true);
  $q$);

SELECT pg_temp.debe_fallar('A.8 · una sola versión de catálogo activa', $q$
  INSERT INTO version_catalogo (id, version, publicada, activa)
    VALUES ('33333333-3333-3333-3333-3333333333ff', 902, true, true);
  $q$);

SELECT pg_temp.debe_fallar('A.9 · tarifa con monto no positivo', $q$
  INSERT INTO tarifa (id, tipo_constancia, concepto, monto, version)
    VALUES ('44444444-4444-4444-4444-4444444444fe','NO_REGISTRO','Gratis', 0, 903);
  $q$);

SELECT pg_temp.debe_fallar('A.10 · catálogo activa sin publicar', $q$
  INSERT INTO version_catalogo (id, version, publicada, activa)
    VALUES ('33333333-3333-3333-3333-3333333333fe', 904, false, true);
  $q$);

SELECT pg_temp.debe_fallar_ctx('A.11 · el catálogo exige rol ti',
  '11111111-1111-1111-1111-111111111111', '["ventanilla"]', $q$
  UPDATE version_catalogo SET vigente_hasta = now() WHERE id = '33333333-3333-3333-3333-333333333333';
  $q$);

SELECT pg_temp.contexto('11111111-1111-1111-1111-111111111111', '["ti"]');


-- =====================================================================
-- B · Camino feliz NO_REGISTRO — la aserción central del recorte
-- =====================================================================

INSERT INTO tramite (id, tipo_constancia, personalidad, representacion, version_catalogo_id, creado_por_id, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666661','NO_REGISTRO','FISICA','TITULAR',
          '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now());
INSERT INTO tramite_persona (id, tramite_id, persona_id, rol)
  VALUES ('66666666-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666661',
          '55555555-5555-5555-5555-555555555555','TITULAR');

SELECT pg_temp.contexto('22222222-2222-2222-2222-222222222222', '["ventanilla"]');

SELECT pg_temp.debe_fallar('B.1 · no se salta de CAPTURA a FINALIZADO', $q$
  UPDATE tramite SET estado = 'FINALIZADO' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_fallar('B.2 · no se valida sin checklist satisfecho', $q$
  UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_pasar('B.3 · adjuntar evidencia del catálogo estampado', $q$
  INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                         hash_sha256, mime_type, tamano_bytes, creado_por_id)
    VALUES ('66666666-1000-0000-0000-000000000001','66666666-6666-6666-6666-666666666661',
            '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'acta.pdf',
            repeat('a',64), 'application/pdf', 1024, '22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar('B.4 · evidencia de un documento ajeno al catálogo', $q$
  INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                         hash_sha256, mime_type, tamano_bytes, creado_por_id)
    VALUES ('66666666-1000-0000-0000-0000000000ff','66666666-6666-6666-6666-666666666661',
            '33333333-0000-0000-0000-000000000013', gen_random_uuid(), 'ajeno.pdf',
            repeat('b',64), 'application/pdf', 1024, '22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar('B.5 · evidencia con hash inválido', $q$
  INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                         hash_sha256, mime_type, tamano_bytes, creado_por_id)
    VALUES ('66666666-1000-0000-0000-0000000000fe','66666666-6666-6666-6666-666666666661',
            '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'malo.pdf',
            'no-es-un-hash', 'application/pdf', 1024, '22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar('B.6 · evidencia con MIME no permitido', $q$
  INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                         hash_sha256, mime_type, tamano_bytes, creado_por_id)
    VALUES ('66666666-1000-0000-0000-0000000000fd','66666666-6666-6666-6666-666666666661',
            '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'macro.docx',
            repeat('c',64), 'application/msword', 1024, '22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar('B.7 · evidencia cargada no satisface el checklist', $q$
  UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_pasar('B.8 · validar la evidencia', $q$
  UPDATE evidencia SET estado = 'VALIDADO' WHERE id = '66666666-1000-0000-0000-000000000001';
  $q$);

SELECT pg_temp.debe_pasar('B.9 · CAPTURA → EN_VALIDACION', $q$
  UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_pasar('B.10 · EN_VALIDACION → APROBADO', $q$
  UPDATE tramite SET estado = 'APROBADO' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.afirmar('B.11 · aprobar fija el plazo de pago',
  (SELECT plazo_pago_hasta > now() FROM tramite WHERE id = '66666666-6666-6666-6666-666666666661'),
  'plazo_pago_hasta = now() + plazo_pago_dias');


-- =====================================================================
-- C · Borrador de cobro — ejercita factura_solicitada_en_ventanilla
-- =====================================================================
-- Es la única ruta que ejecuta las dos referencias a la columna renombrada
-- dentro de fn_borrador_cobro_integridad. Si el rename hubiera fallado, aquí
-- aparece «column ... does not exist».

SELECT pg_temp.debe_pasar('C.1 · abrir borrador de cobro', $q$
  INSERT INTO borrador_cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                              forma_pago, metodo_pago, moneda, factura_solicitada_en_ventanilla,
                              creado_por_id, actualizado_por_id, updated_at)
    VALUES ('77777777-7777-7777-7777-777777777771','66666666-6666-6666-6666-666666666661',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','MXN', true,
            '22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', now());
  $q$);

SELECT pg_temp.debe_fallar('C.2 · un solo borrador ABIERTO por trámite', $q$
  INSERT INTO borrador_cobro (id, tramite_id, creado_por_id, actualizado_por_id, updated_at)
    VALUES ('77777777-7777-7777-7777-7777777777ff','66666666-6666-6666-6666-666666666661',
            '22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', now());
  $q$);

SELECT pg_temp.debe_fallar_ctx('C.3 · el borrador exige rol ventanilla',
  '22222222-2222-2222-2222-222222222222', '["ti"]',
  $q$ UPDATE borrador_cobro SET referencia_pago = 'X', updated_at = now()
       WHERE id = '77777777-7777-7777-7777-777777777771' $q$);
SELECT pg_temp.contexto('22222222-2222-2222-2222-222222222222', '["ventanilla"]');

SELECT pg_temp.debe_pasar('C.4 · cobro definitivo con comprobante adjunto', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, moneda, factura_solicitada_en_ventanilla,
                     referencia_pago, cobrado_por_id,
                     comprobante_archivo_uuid, comprobante_nombre_original,
                     comprobante_hash_sha256, comprobante_mime_type, comprobante_tamano_bytes)
    VALUES ('88888888-8888-8888-8888-888888888881','66666666-6666-6666-6666-666666666661',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','MXN', true, 'AUTH-000123','22222222-2222-2222-2222-222222222222',
            gen_random_uuid(), 'ticket-terminal.pdf', repeat('d',64), 'application/pdf', 5120);
  $q$);

-- El único campo distinto es factura_solicitada_en_ventanilla: false en el
-- borrador, true en el cobro. Aísla la columna renombrada.
SELECT pg_temp.debe_fallar('C.5 · aplicar el borrador con la marca de factura distinta a la del cobro', $q$
  UPDATE borrador_cobro
     SET estado = 'APLICADO', cobro_id = '88888888-8888-8888-8888-888888888881',
         factura_solicitada_en_ventanilla = false, referencia_pago = 'AUTH-000123',
         updated_at = now()
   WHERE id = '77777777-7777-7777-7777-777777777771';
  $q$);

SELECT pg_temp.debe_pasar('C.6 · aplicar el borrador contra su cobro', $q$
  UPDATE borrador_cobro
     SET estado = 'APLICADO', cobro_id = '88888888-8888-8888-8888-888888888881',
         referencia_pago = 'AUTH-000123', updated_at = now()
   WHERE id = '77777777-7777-7777-7777-777777777771';
  $q$);

SELECT pg_temp.afirmar('C.7 · aplicar sella aplicado_at',
  (SELECT aplicado_at IS NOT NULL FROM borrador_cobro WHERE id = '77777777-7777-7777-7777-777777777771'),
  'aplicado_at lo pone el trigger');

SELECT pg_temp.debe_fallar('C.8 · un borrador APLICADO ya no se modifica', $q$
  UPDATE borrador_cobro SET referencia_pago = 'OTRA', updated_at = now()
   WHERE id = '77777777-7777-7777-7777-777777777771';
  $q$);

SELECT pg_temp.debe_fallar('C.9 · cobro con monto_final inconsistente', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, cobrado_por_id)
    VALUES ('88888888-8888-8888-8888-8888888888ff','66666666-6666-6666-6666-666666666661',
            '44444444-4444-4444-4444-444444444441', 350.00, 50, 350.00,
            '04','PUE','22222222-2222-2222-2222-222222222222');
  $q$);


-- =====================================================================
-- B (cont.) · cierre del trámite sin CFDI
-- =====================================================================

SELECT pg_temp.debe_pasar('B.12 · APROBADO → COBRO', $q$
  UPDATE tramite SET estado = 'COBRO' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_fallar('B.13 · COBRO → FINALIZADO sin constancia', $q$
  UPDATE tramite SET estado = 'FINALIZADO' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_pasar('B.14 · emitir la constancia', $q$
  INSERT INTO constancia (id, tramite_id, folio_unico, hash_pdf, archivo_uuid,
                          vigencia_inicio, vigencia_fin, hash_contenido, version_token)
    VALUES ('99999999-9999-9999-9999-999999999991','66666666-6666-6666-6666-666666666661',
            'GSTS-9001-VERIF001', repeat('e',64), gen_random_uuid(),
            now(), now() + interval '90 days', repeat('f',64), 'v1');
  $q$);

-- ►►► La regla que cambió el recorte: el trámite cierra con la constancia
--     emitida, sin exigir CFDI timbrado.
SELECT pg_temp.debe_pasar('B.15 · COBRO → FINALIZADO SIN FACTURA', $q$
  UPDATE tramite SET estado = 'FINALIZADO' WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.afirmar('B.16 · el trámite quedó FINALIZADO',
  (SELECT estado = 'FINALIZADO' FROM tramite WHERE id = '66666666-6666-6666-6666-666666666661'),
  'sin ninguna tabla de facturación involucrada');


-- =====================================================================
-- D · Guardias de NO_ADEUDO
-- =====================================================================

INSERT INTO tramite (id, tipo_constancia, personalidad, representacion, version_catalogo_id, creado_por_id, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666663','NO_ADEUDO','MORAL','REPRESENTANTE',
          '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now());
INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                       hash_sha256, mime_type, tamano_bytes, estado, creado_por_id)
  VALUES ('66666666-3000-0000-0000-000000000001','66666666-6666-6666-6666-666666666663',
          '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'acta.pdf',
          repeat('1',64), 'application/pdf', 2048, 'VALIDADO', '22222222-2222-2222-2222-222222222222');
UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666663';

SELECT pg_temp.debe_fallar('D.1 · NO_ADEUDO no se aprueba sin validación inicial SIN_ADEUDO', $q$
  UPDATE tramite SET estado = 'APROBADO' WHERE id = '66666666-6666-6666-6666-666666666663';
  $q$);

INSERT INTO validacion_no_adeudo (id, tramite_id, metodo, momento, resultado, validado_por_id)
  VALUES ('66666666-4000-0000-0000-000000000001','66666666-6666-6666-6666-666666666663',
          'MANUAL','VALIDACION_INICIAL','SIN_ADEUDO','22222222-2222-2222-2222-222222222222');

SELECT pg_temp.debe_pasar('D.2 · con validación inicial sí aprueba', $q$
  UPDATE tramite SET estado = 'APROBADO' WHERE id = '66666666-6666-6666-6666-666666666663';
  $q$);

INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                   forma_pago, metodo_pago, cobrado_por_id)
  VALUES ('88888888-8888-8888-8888-888888888883','66666666-6666-6666-6666-666666666663',
          '44444444-4444-4444-4444-444444444442', 420.00, 0, 420.00,
          '04','PUE','22222222-2222-2222-2222-222222222222');

SELECT pg_temp.debe_fallar('D.3 · NO_ADEUDO no se cobra sin revalidación', $q$
  UPDATE tramite SET estado = 'COBRO' WHERE id = '66666666-6666-6666-6666-666666666663';
  $q$);

INSERT INTO validacion_no_adeudo (id, tramite_id, metodo, momento, resultado, validado_por_id)
  VALUES ('66666666-4000-0000-0000-000000000002','66666666-6666-6666-6666-666666666663',
          'MANUAL','REVALIDACION_COBRO','SIN_ADEUDO','22222222-2222-2222-2222-222222222222');

SELECT pg_temp.debe_pasar('D.4 · con revalidación sí cobra', $q$
  UPDATE tramite SET estado = 'COBRO' WHERE id = '66666666-6666-6666-6666-666666666663';
  $q$);


-- =====================================================================
-- E · Plazo vencido: cobro tardío, expiración y cascadas
-- =====================================================================

-- E.a · trámite con cobro registrado y plazo movido al pasado.
INSERT INTO tramite (id, tipo_constancia, personalidad, representacion, version_catalogo_id, creado_por_id, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666664','NO_REGISTRO','FISICA','TITULAR',
          '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now());
INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                       hash_sha256, mime_type, tamano_bytes, estado, creado_por_id)
  VALUES ('66666666-3000-0000-0000-000000000002','66666666-6666-6666-6666-666666666664',
          '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'acta.pdf',
          repeat('2',64), 'application/pdf', 2048, 'VALIDADO', '22222222-2222-2222-2222-222222222222');
UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666664';
UPDATE tramite SET estado = 'APROBADO'      WHERE id = '66666666-6666-6666-6666-666666666664';
-- El borrador va antes que el cobro: un borrador ABIERTO no puede nacer en un
-- trámite que ya tiene cobro definitivo.
INSERT INTO borrador_cobro (id, tramite_id, creado_por_id, actualizado_por_id, updated_at)
  VALUES ('77777777-7777-7777-7777-777777777774','66666666-6666-6666-6666-666666666664',
          '22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', now());
INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                   forma_pago, metodo_pago, cobrado_por_id)
  VALUES ('88888888-8888-8888-8888-888888888884','66666666-6666-6666-6666-666666666664',
          '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
          '04','PUE','22222222-2222-2222-2222-222222222222');

-- Mover el plazo no dispara trg_tramite_transicion_valida: es BEFORE UPDATE OF estado.
UPDATE tramite SET plazo_pago_hasta = now() - interval '1 day'
  WHERE id = '66666666-6666-6666-6666-666666666664';

SELECT pg_temp.debe_fallar('E.1 · no se cobra después del plazo de pago', $q$
  UPDATE tramite SET estado = 'COBRO' WHERE id = '66666666-6666-6666-6666-666666666664';
  $q$);

SELECT pg_temp.debe_fallar('E.2 · no se registra un cobro fuera de plazo', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, cobrado_por_id)
    VALUES ('88888888-8888-8888-8888-88888888ff84','66666666-6666-6666-6666-666666666664',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_pasar('E.3 · APROBADO → EXPIRADO tras el vencimiento', $q$
  UPDATE tramite SET estado = 'EXPIRADO' WHERE id = '66666666-6666-6666-6666-666666666664';
  $q$);

SELECT pg_temp.afirmar('E.4 · expirar vence el borrador ABIERTO en cascada',
  (SELECT estado = 'VENCIDO' AND vencido_at IS NOT NULL FROM borrador_cobro
     WHERE id = '77777777-7777-7777-7777-777777777774'),
  'la cascada la ejecuta fn_tramite_transicion_valida');

-- E.b · rechazo: el borrador se cancela.
INSERT INTO tramite (id, tipo_constancia, personalidad, representacion, version_catalogo_id, creado_por_id, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666665','NO_REGISTRO','FISICA','TITULAR',
          '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now());
INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                       hash_sha256, mime_type, tamano_bytes, estado, creado_por_id)
  VALUES ('66666666-3000-0000-0000-000000000003','66666666-6666-6666-6666-666666666665',
          '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'acta.pdf',
          repeat('3',64), 'application/pdf', 2048, 'VALIDADO', '22222222-2222-2222-2222-222222222222');
UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666665';
UPDATE tramite SET estado = 'APROBADO'      WHERE id = '66666666-6666-6666-6666-666666666665';
INSERT INTO borrador_cobro (id, tramite_id, creado_por_id, actualizado_por_id, updated_at)
  VALUES ('77777777-7777-7777-7777-777777777775','66666666-6666-6666-6666-666666666665',
          '22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', now());

SELECT pg_temp.debe_pasar('E.5 · APROBADO → RECHAZADO', $q$
  UPDATE tramite SET estado = 'RECHAZADO', motivo_rechazo = 'Verificación'
   WHERE id = '66666666-6666-6666-6666-666666666665';
  $q$);

SELECT pg_temp.afirmar('E.6 · rechazar cancela el borrador ABIERTO en cascada',
  (SELECT estado = 'CANCELADO' AND cancelado_at IS NOT NULL FROM borrador_cobro
     WHERE id = '77777777-7777-7777-7777-777777777775'),
  'la cascada la ejecuta fn_tramite_transicion_valida');


-- =====================================================================
-- F · Aprobar sin configuración de plazos activa
-- =====================================================================

INSERT INTO tramite (id, tipo_constancia, personalidad, representacion, version_catalogo_id, creado_por_id, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666667','NO_REGISTRO','FISICA','TITULAR',
          '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now());
INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                       hash_sha256, mime_type, tamano_bytes, estado, creado_por_id)
  VALUES ('66666666-3000-0000-0000-000000000004','66666666-6666-6666-6666-666666666667',
          '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'acta.pdf',
          repeat('4',64), 'application/pdf', 2048, 'VALIDADO', '22222222-2222-2222-2222-222222222222');
UPDATE tramite SET estado = 'EN_VALIDACION' WHERE id = '66666666-6666-6666-6666-666666666667';

SELECT pg_temp.contexto('11111111-1111-1111-1111-111111111111', '["ti"]');
UPDATE configuracion_plazos SET activa = false, updated_at = now() WHERE id = 'PLAZOS_OPERATIVOS';
SELECT pg_temp.contexto('22222222-2222-2222-2222-222222222222', '["ventanilla"]');

SELECT pg_temp.debe_fallar('F.1 · no se aprueba sin plazo de pago configurado', $q$
  UPDATE tramite SET estado = 'APROBADO' WHERE id = '66666666-6666-6666-6666-666666666667';
  $q$);

SELECT pg_temp.contexto('11111111-1111-1111-1111-111111111111', '["ti"]');
SELECT pg_temp.debe_fallar('F.2 · la configuración de plazos no se borra', $q$
  DELETE FROM configuracion_plazos WHERE id = 'PLAZOS_OPERATIVOS';
  $q$);
SELECT pg_temp.debe_fallar('F.3 · configuración activa con plazo no positivo', $q$
  UPDATE configuracion_plazos SET activa = true, plazo_pago_dias = 0, updated_at = now()
   WHERE id = 'PLAZOS_OPERATIVOS';
  $q$);
UPDATE configuracion_plazos SET activa = true, updated_at = now() WHERE id = 'PLAZOS_OPERATIVOS';
SELECT pg_temp.contexto('22222222-2222-2222-2222-222222222222', '["ventanilla"]');

SELECT pg_temp.debe_pasar('F.4 · con la configuración reactivada sí aprueba', $q$
  UPDATE tramite SET estado = 'APROBADO' WHERE id = '66666666-6666-6666-6666-666666666667';
  $q$);


-- =====================================================================
-- G · Contexto transaccional
-- =====================================================================
-- El trámite 6667 quedó APROBADO y dentro de plazo, así que un cobro sobre él
-- sólo puede ser rechazado por el contexto: si la guardia de contexto no
-- disparara, el INSERT pasaría.

SELECT pg_temp.debe_fallar_ctx('G.1 · cobro sin app.actor_id', '', '["ventanilla"]', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, cobrado_por_id)
    VALUES ('88888888-8888-8888-8888-8888888888f1','66666666-6666-6666-6666-666666666667',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar_ctx('G.2 · cobro con rol distinto de ventanilla',
  '22222222-2222-2222-2222-222222222222', '["ti"]', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, cobrado_por_id)
    VALUES ('88888888-8888-8888-8888-8888888888f2','66666666-6666-6666-6666-666666666667',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar_ctx('G.3 · app.roles mal formado',
  '22222222-2222-2222-2222-222222222222', 'ventanilla', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, cobrado_por_id)
    VALUES ('88888888-8888-8888-8888-8888888888f3','66666666-6666-6666-6666-666666666667',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar_ctx('G.4 · cobro atribuido a otro actor',
  '11111111-1111-1111-1111-111111111111', '["ventanilla"]', $q$
  INSERT INTO cobro (id, tramite_id, tarifa_id, monto_base, porcentaje_reduccion, monto_final,
                     forma_pago, metodo_pago, cobrado_por_id)
    VALUES ('88888888-8888-8888-8888-8888888888f4','66666666-6666-6666-6666-666666666667',
            '44444444-4444-4444-4444-444444444441', 350.00, 0, 350.00,
            '04','PUE','22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.contexto('22222222-2222-2222-2222-222222222222', '["ventanilla"]');


-- =====================================================================
-- H · Inmutabilidad y no borrado
-- =====================================================================

SELECT pg_temp.debe_fallar('H.1 · el folio de la constancia es inmutable', $q$
  UPDATE constancia SET folio_unico = 'OTRO' WHERE id = '99999999-9999-9999-9999-999999999991';
  $q$);

SELECT pg_temp.debe_fallar('H.2 · el hash de contenido de la constancia es inmutable', $q$
  UPDATE constancia SET hash_contenido = repeat('0',64) WHERE id = '99999999-9999-9999-9999-999999999991';
  $q$);

SELECT pg_temp.debe_pasar('H.3 · la constancia sí se puede anular', $q$
  UPDATE constancia SET anulada = true WHERE id = '99999999-9999-9999-9999-999999999991';
  $q$);

SELECT pg_temp.debe_fallar('H.4 · la constancia no se elimina', $q$
  DELETE FROM constancia WHERE id = '99999999-9999-9999-9999-999999999991';
  $q$);

SELECT pg_temp.debe_pasar('H.5 · archivo generado colgado de la constancia', $q$
  INSERT INTO archivo_generado (id, constancia_id, tipo, archivo_uuid, ruta, hash_sha256, mime_type, tamano_bytes)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','99999999-9999-9999-9999-999999999991',
            'CONSTANCIA', gen_random_uuid(), '/assets/constancias/x.pdf',
            repeat('9',64), 'application/pdf', 20480);
  $q$);

SELECT pg_temp.debe_fallar('H.6 · archivo generado sin constancia', $q$
  INSERT INTO archivo_generado (id, constancia_id, tipo, archivo_uuid, ruta, hash_sha256, mime_type, tamano_bytes)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaff', NULL,
            'CONSTANCIA', gen_random_uuid(), '/assets/constancias/y.pdf',
            repeat('9',64), 'application/pdf', 20480);
  $q$);

SELECT pg_temp.debe_fallar('H.7 · los metadatos del archivo generado son inmutables', $q$
  UPDATE archivo_generado SET hash_sha256 = repeat('8',64)
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  $q$);

SELECT pg_temp.debe_pasar('H.8 · el archivo generado sí cambia de conservación', $q$
  UPDATE archivo_generado SET conservacion = 'RETENIDO'
   WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  $q$);

SELECT pg_temp.debe_fallar('H.9 · los campos canónicos del cobro son inmutables', $q$
  UPDATE cobro SET monto_final = 1.00, monto_base = 1.00
   WHERE id = '88888888-8888-8888-8888-888888888881';
  $q$);

SELECT pg_temp.debe_fallar('H.10 · el trámite no se elimina', $q$
  DELETE FROM tramite WHERE id = '66666666-6666-6666-6666-666666666661';
  $q$);

SELECT pg_temp.debe_fallar('H.11 · el cobro no se elimina', $q$
  DELETE FROM cobro WHERE id = '88888888-8888-8888-8888-888888888881';
  $q$);

SELECT pg_temp.debe_fallar('H.12 · la evidencia no se elimina', $q$
  DELETE FROM evidencia WHERE id = '66666666-1000-0000-0000-000000000001';
  $q$);

SELECT pg_temp.debe_fallar('H.13 · el borrador de cobro no se elimina', $q$
  DELETE FROM borrador_cobro WHERE id = '77777777-7777-7777-7777-777777777771';
  $q$);


-- =====================================================================
-- J · Bitácora append-only
-- =====================================================================

SELECT pg_temp.debe_pasar('J.1 · bitácora de usuario con contexto correcto', $q$
  INSERT INTO bitacora (id, actor_id, roles_snapshot, ip_address, user_agent, origen,
                        entidad, entidad_id, accion, request_id)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','22222222-2222-2222-2222-222222222222',
            '["ventanilla"]'::jsonb, '10.0.0.1', 'verificacion', 'USUARIO',
            'tramite','66666666-6666-6666-6666-666666666661','FINALIZAR',
            '99999999-9999-9999-9999-999999999999');
  $q$);

SELECT pg_temp.debe_fallar('J.2 · roles_snapshot distinto de app.roles', $q$
  INSERT INTO bitacora (id, actor_id, roles_snapshot, ip_address, user_agent, origen,
                        entidad, entidad_id, accion, request_id)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf2','22222222-2222-2222-2222-222222222222',
            '["ti"]'::jsonb, '10.0.0.1', 'verificacion', 'USUARIO',
            'tramite','66666666-6666-6666-6666-666666666661','FINALIZAR',
            '99999999-9999-9999-9999-999999999999');
  $q$);

SELECT pg_temp.debe_fallar('J.3 · bitácora de usuario sin IP ni user-agent', $q$
  INSERT INTO bitacora (id, actor_id, roles_snapshot, origen, entidad, entidad_id, accion, request_id)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf3','22222222-2222-2222-2222-222222222222',
            '["ventanilla"]'::jsonb, 'USUARIO',
            'tramite','66666666-6666-6666-6666-666666666661','FINALIZAR',
            '99999999-9999-9999-9999-999999999999');
  $q$);

SELECT pg_temp.debe_pasar('J.4 · bitácora de portal sin actor', $q$
  INSERT INTO bitacora (id, ip_address, user_agent, origen, entidad, entidad_id, accion, request_id)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '10.0.0.2', 'portal', 'PORTAL',
            'constancia','99999999-9999-9999-9999-999999999991','VERIFICAR',
            '99999999-9999-9999-9999-999999999999');
  $q$);

SELECT pg_temp.debe_fallar('J.5 · bitácora de portal con actor interno', $q$
  INSERT INTO bitacora (id, actor_id, ip_address, user_agent, origen, entidad, entidad_id, accion, request_id)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf5','22222222-2222-2222-2222-222222222222',
            '10.0.0.2', 'portal', 'PORTAL',
            'constancia','99999999-9999-9999-9999-999999999991','VERIFICAR',
            '99999999-9999-9999-9999-999999999999');
  $q$);

SELECT pg_temp.debe_fallar('J.6 · bitácora de worker sin request_id ni job_id', $q$
  INSERT INTO bitacora (id, origen, entidad, entidad_id, accion)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbf6','WORKER',
            'tramite','66666666-6666-6666-6666-666666666664','EXPIRAR');
  $q$);

SELECT pg_temp.debe_fallar('J.7 · la bitácora no se modifica', $q$
  UPDATE bitacora SET accion = 'ALTERADO' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  $q$);

SELECT pg_temp.debe_fallar('J.8 · la bitácora no se borra', $q$
  DELETE FROM bitacora WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  $q$);


-- =====================================================================
-- K · Tope acumulado de evidencias (30 MB por trámite)
-- =====================================================================

INSERT INTO tramite (id, tipo_constancia, personalidad, representacion, version_catalogo_id, creado_por_id, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666668','NO_REGISTRO','FISICA','TITULAR',
          '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now());

SELECT pg_temp.debe_pasar('K.1 · evidencia justo en el tope de 30 MB', $q$
  INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                         hash_sha256, mime_type, tamano_bytes, creado_por_id)
    VALUES ('66666666-5000-0000-0000-000000000001','66666666-6666-6666-6666-666666666668',
            '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'grande.pdf',
            repeat('5',64), 'application/pdf', 31457280, '22222222-2222-2222-2222-222222222222');
  $q$);

SELECT pg_temp.debe_fallar('K.2 · un byte más excede el tope acumulado', $q$
  INSERT INTO evidencia (id, tramite_id, opcion_documento_id, archivo_uuid, nombre_original,
                         hash_sha256, mime_type, tamano_bytes, creado_por_id)
    VALUES ('66666666-5000-0000-0000-0000000000ff','66666666-6666-6666-6666-666666666668',
            '33333333-0000-0000-0000-000000000003', gen_random_uuid(), 'gota.pdf',
            repeat('6',64), 'application/pdf', 1, '22222222-2222-2222-2222-222222222222');
  $q$);


-- =====================================================================
-- I (cont.) · el rol fiscal desapareció del enum
-- =====================================================================

SELECT pg_temp.debe_fallar('I.6 · tramite_persona con rol RECEPTOR_FISCAL', $q$
  INSERT INTO tramite_persona (id, tramite_id, persona_id, rol)
    VALUES ('66666666-0000-0000-0000-0000000000ff','66666666-6666-6666-6666-666666666661',
            '55555555-5555-5555-5555-555555555555','RECEPTOR_FISCAL');
  $q$);


-- =====================================================================
-- Veredicto
-- =====================================================================

\pset tuples_only off
\pset format aligned

\echo ''
\echo '=== Detalle ==='
SELECT n, CASE WHEN ok THEN 'ok ' ELSE '>>>' END AS r, caso, left(detalle, 90) AS detalle
  FROM verificacion ORDER BY n;

\echo ''
\echo '=== Fallas ==='
SELECT n, caso, detalle FROM verificacion WHERE NOT ok ORDER BY n;

\echo ''
\echo '=== Resumen ==='
SELECT count(*) FILTER (WHERE ok) AS pasaron,
       count(*) FILTER (WHERE NOT ok) AS fallaron,
       count(*) AS total
  FROM verificacion;

-- La base queda como estaba.
ROLLBACK;
