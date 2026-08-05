import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `generate` no abre una conexión; este valor sintácticamente válido evita
  // exigir secretos sólo para generar el cliente. Migrate y la API usan el
  // DATABASE_URL real inyectado por cada entorno.
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://sicef_app:CHANGE_ME@localhost:6432/sicef_db' },
});
