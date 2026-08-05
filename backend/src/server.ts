import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { prisma } from './infrastructure/database/prisma.js';

const env = loadEnv();
const app = createApp(env);
const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`SICEF API listening on ${env.HOST}:${env.PORT}${env.API_PREFIX}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}

process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });
