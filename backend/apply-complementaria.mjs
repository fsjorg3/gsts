// Aplica prisma/migration_complementaria.sql contra la base real usando el rol
// owner (DIRECT_DATABASE_URL): ALTER TABLE / CREATE OR REPLACE FUNCTION /
// CREATE TRIGGER requieren privilegios que el rol de runtime (sicef_app) no
// tiene. El archivo no trae meta-comandos de psql, así que se ejecuta entero
// como una sola llamada multi-statement.
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const connectionString = process.env.DIRECT_DATABASE_URL;
if (!connectionString) {
  console.error('Falta DIRECT_DATABASE_URL en el entorno.');
  process.exit(1);
}

const sql = readFileSync(new URL('./prisma/migration_complementaria.sql', import.meta.url), 'utf8');

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(sql);
  console.log('migration_complementaria.sql aplicada correctamente.');
} finally {
  await client.end();
}
