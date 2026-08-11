# Backend SICEF

El backend se ejecuta como un monolito modular y no incluye worker, cola de timbrado ni reintentos PAC.

## Base de datos

La ubicación canónica de Prisma es `backend/prisma`. La base se instala en **dos pasos**: primero la estructura generada por Prisma (`migrations/0001_init/migration.sql`), luego las reglas de integridad que Prisma no puede expresar (`migration_complementaria.sql`: CHECKs, índices únicos parciales, triggers de inmutabilidad, bitácora append-only y máquina de estados).

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate                        # 1. estructura (prisma migrate deploy)
psql "$env:DIRECT_DATABASE_URL" -f prisma/migration_complementaria.sql   # 2. reglas complementarias
psql "$env:DIRECT_DATABASE_URL" -q -v ON_ERROR_STOP=1 -f prisma/verificacion_integridad.sql   # 3. comprobación
npm run dev
```

El paso 2 se ejecuta una sola vez por versión de base, después de aplicar la estructura. `prisma migrate` por sí solo **no** instala las reglas complementarias.

### Paso 3: comprobar que las reglas quedaron vivas

`prisma/verificacion_integridad.sql` recorre el flujo completo —captura, validación, aprobación, borrador, cobro con comprobante, constancia y cierre— y comprueba una por una las guardias de la capa complementaria. Termina imprimiendo la lista de fallas y un resumen.

Existe porque **PostgreSQL no valida los nombres de columna dentro del cuerpo de una función plpgsql al crearla**: `CREATE FUNCTION` reporta éxito aunque el cuerpo referencie columnas inexistentes, y el error sólo aparece cuando el trigger se dispara por primera vez. Que `migration_complementaria.sql` se instale sin errores no prueba que las reglas funcionen.

Todo ocurre dentro de una transacción que termina en `ROLLBACK`, así que puede correrse cuantas veces se quiera y también sobre una base con datos.

Las bases de desarrollo y pruebas deben iniciarse vacías. No se usa ni se requiere una semilla para configurar catálogos: un actor con claim `ti` realiza esa configuración desde la API.

### ⚠️ `prisma migrate reset` borra los permisos de `sicef_app`/`sicef_ro`

`init_postgres_soapap3.sql` (ver `documentacion/`) crea los roles y usa `ALTER DEFAULT PRIVILEGES` sobre el esquema `public` para que `sicef_app`/`sicef_ro` hereden permisos sobre las tablas que Prisma cree después. **`prisma migrate reset` hace `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`** antes de reaplicar las migraciones: el esquema recreado es un objeto nuevo, así que los `GRANT`/`ALTER DEFAULT PRIVILEGES` configurados sobre el `public` anterior no se heredan y `sicef_app` queda sin ningún privilegio (ni `SELECT`, ni `INSERT`) sobre ninguna tabla.

Si usaste `migrate reset` contra una base ya inicializada con `init_postgres_soapap3.sql`, después de la migración **debes re-ejecutar las secciones 3 (aislamiento) y 4 (permisos)** de ese script (son idempotentes) y volver a aplicar `migration_complementaria.sql` (para que su `REVOKE UPDATE, DELETE ON bitacora FROM sicef_app` narrowing se aplique sobre los permisos recién otorgados, no sobre un rol sin privilegios). Orden: permisos base → complementario.

En producción, prefiere `prisma migrate deploy` (nunca `reset`) para no destruir el esquema entre despliegues.
