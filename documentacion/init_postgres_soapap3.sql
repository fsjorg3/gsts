-- =============================================================================
-- Inicialización del PostgreSQL centralizado — SOAPAP
-- Servidor: postgres-central (VM 110) · 172.16.1.45 · PostgreSQL 18
-- Alcance de esta versión: solo SICEF
-- =============================================================================
--
-- EJECUCIÓN EN UN SERVIDOR NUEVO (roles y base aún no existen):
--
--   cd /ruta/donde/esta/el/archivo
--   chmod 600 init_postgres_soapap3.sql
--   sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -f init_postgres_soapap3.sql
--
-- EJECUCIÓN SI LOS ROLES YA EXISTEN:
--   No ejecutes el archivo completo: CREATE ROLE fallará. Comenta la sección
--   1. ROLES y, si sicef_db ya existe, también la sección 2. BASE DE DATOS.
--   Después ejecuta el mismo comando anterior. Las secciones de aislamiento,
--   permisos, extensión y verificación se pueden aplicar nuevamente.
--
-- DESPUÉS DE ESTE SCRIPT:
--   1. Ejecuta `prisma migrate deploy` desde `backend`, usando temporalmente
--      DATABASE_URL de sicef_owner. La migración inicial ya incluye las
--      reglas SQL complementarias.
--   2. Asigna el claim de realm `ti` al primer administrador en Keycloak y
--      configura configuracion_plazos con valores positivos desde SICEF.
--   3. Para la aplicación en runtime, usa DATABASE_URL de sicef_app.
--
-- PRE-REQUISITO (obligatorio):
--   El locale es_MX.UTF-8 se generó DESPUÉS de instalar PostgreSQL. El motor
--   carga los locales disponibles al arrancar, así que hay que reiniciarlo o
--   el CREATE DATABASE de la sección 2 fallará:
--
--       systemctl restart postgresql
--       sudo -u postgres psql -c "SELECT collname FROM pg_collation WHERE collname LIKE 'es_MX%';"
--
--   Si esa consulta no devuelve filas, NO ejecutes este script.
--
-- USO:
--   1. Reemplaza los placeholders <CAMBIAR_*> por contraseñas reales.
--      Genera cada una con: openssl rand -base64 24
--      Guárdalas en el gestor de contraseñas ANTES de ejecutar.
--   2. Ejecuta:  sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -f init_postgres_soapap3.sql
--   3. Destruye el archivo después (contiene contraseñas en claro):
--      shred -u init_postgres_soapap3.sql
--
-- MODELO DE ROLES:
--   sicef_owner : dueño de la BD y de los objetos. Lo usa Prisma para las
--                 migraciones (DATABASE_URL temporal de despliegue). Tiene DDL.
--                 NO debe usarse en runtime.
--   sicef_app   : usuario de runtime. Solo DML (SELECT/INSERT/UPDATE/DELETE)
--                 sobre los objetos que crea sicef_owner. Sin DDL.
--                 Es el que va en `DATABASE_URL`.
--   sicef_ro    : solo lectura. Reportes, BI, consultas de auditoría.
--
-- LOCALE: es_MX.UTF-8 (generado con locale-gen).
-- =============================================================================

-- Detener en el primer error. Sin esto, si el CREATE DATABASE falla (p. ej.
-- por el locale no cargado), el \connect de la sección 4 también falla y psql
-- sigue conectado a la base 'postgres' — aplicando los REVOKE/GRANT a la base
-- EQUIVOCADA. Con esto, el script se detiene limpiamente.
\set ON_ERROR_STOP on


-- =============================================================================
-- 1. ROLES
-- =============================================================================

CREATE ROLE sicef_owner LOGIN PASSWORD '<CAMBIAR_SICEF_OWNER>';
CREATE ROLE sicef_app   LOGIN PASSWORD '<CAMBIAR_SICEF_APP>';
CREATE ROLE sicef_ro    LOGIN PASSWORD '<CAMBIAR_SICEF_RO>';


-- =============================================================================
-- 2. BASE DE DATOS
-- =============================================================================
-- TEMPLATE template0 es obligatorio al especificar locale explícito.

CREATE DATABASE sicef_db
    OWNER sicef_owner
    ENCODING 'UTF8'
    LC_COLLATE 'es_MX.UTF-8'
    LC_CTYPE 'es_MX.UTF-8'
    TEMPLATE template0;


-- =============================================================================
-- 3. AISLAMIENTO
-- =============================================================================
-- Por defecto PUBLIC (= todo rol) puede conectarse a cualquier base.
-- Esto lo cierra: solo los roles autorizados entran.

REVOKE CONNECT ON DATABASE sicef_db FROM PUBLIC;
GRANT  CONNECT ON DATABASE sicef_db TO sicef_owner, sicef_app, sicef_ro;


-- =============================================================================
-- 4. PERMISOS DENTRO DE LA BASE
-- =============================================================================
-- ALTER DEFAULT PRIVILEGES es la pieza clave: los objetos que sicef_owner cree
-- EN EL FUTURO (cada migración de Prisma) heredan automáticamente los permisos
-- correctos para _app y _ro. Sin esto habría que correr GRANTs manuales tras
-- cada `prisma migrate deploy`.

\connect sicef_db

-- Solo el owner puede crear objetos en el esquema public
REVOKE ALL   ON SCHEMA public FROM PUBLIC;
GRANT  ALL   ON SCHEMA public TO sicef_owner;
GRANT  USAGE ON SCHEMA public TO sicef_app, sicef_ro;

-- Objetos que ya existan (no aplica en BD nueva, pero es idempotente)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO sicef_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO sicef_app;
GRANT SELECT                         ON ALL TABLES    IN SCHEMA public TO sicef_ro;

-- Objetos FUTUROS creados por sicef_owner
ALTER DEFAULT PRIVILEGES FOR ROLE sicef_owner IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sicef_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sicef_owner IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO sicef_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sicef_owner IN SCHEMA public
    GRANT SELECT ON TABLES TO sicef_ro;

-- pgcrypto: gen_random_uuid(), digest(), hmac()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\connect postgres


-- =============================================================================
-- 5. VERIFICACIÓN
-- =============================================================================
\echo '--- Roles ---'
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles
WHERE rolname NOT LIKE 'pg\_%'
ORDER BY rolname;

\echo ''
\echo '--- Bases de datos ---'
SELECT d.datname,
       pg_catalog.pg_get_userbyid(d.datdba) AS owner,
       pg_encoding_to_char(d.encoding)      AS encoding,
       d.datcollate,
       pg_size_pretty(pg_database_size(d.datname)) AS size
FROM pg_database d
WHERE d.datistemplate = false
ORDER BY d.datname;

\echo ''
\echo '--- ACL de conexión: sicef_db NO debe tener "=Tc/" (eso sería PUBLIC) ---'
SELECT datname, datacl
FROM pg_database
WHERE datistemplate = false
ORDER BY datname;


-- =============================================================================
-- PENDIENTES / MÓDULOS FUTUROS
-- =============================================================================
--
-- CORRESPONDENCIA (correspondencia_db)
--   Software de desarrollo externo; se migrará cuando lleguen indicaciones.
--   Maneja un solo usuario, así que NO aplica el patrón owner/app: será un rol
--   único con propiedad de la base (como Keycloak). Plantilla:
--
--   CREATE ROLE correspondencia_owner LOGIN PASSWORD '<CAMBIAR>';
--   CREATE DATABASE correspondencia_db
--       OWNER correspondencia_owner
--       ENCODING 'UTF8' LC_COLLATE 'es_MX.UTF-8' LC_CTYPE 'es_MX.UTF-8'
--       TEMPLATE template0;
--   REVOKE CONNECT ON DATABASE correspondencia_db FROM PUBLIC;
--   GRANT  CONNECT ON DATABASE correspondencia_db TO correspondencia_owner;
--
-- TURNERO / SGD
--   Aplicar el mismo patrón owner/app/ro de SICEF cuando se desarrollen.
--
-- KEYCLOAK
--   Decisión tomada: NO se muda. Conserva su BD en el LXC 203.
--
-- MONITOREO (pg_stat_statements)
--   Identifica las queries más costosas. Requiere en postgresql.conf:
--       shared_preload_libraries = 'pg_stat_statements'
--   reiniciar el servicio, y luego:
--       \connect sicef_db
--       CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- =============================================================================
