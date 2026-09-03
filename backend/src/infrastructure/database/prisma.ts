import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { GstsClaims } from '../../modules/auth/claims.js';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://sicef_app:CHANGE_ME@localhost:6432/sicef_db';
const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

export interface DatabaseContext {
  actorId: string;
  roles: GstsClaims['roles'];
  requestId: string;
}

export async function withBusinessTransaction<T>(
  context: DatabaseContext,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  // Por defecto, el timeout de interactive transaction de Prisma (5s). Algunas
  // mutaciones hacen trabajo no trivial dentro de la transacción a propósito
  // (p. ej. emitir constancia: renderiza el PDF y lo guarda en NFS antes del
  // INSERT, para que el consecutivo del folio —ver folio.ts— sólo avance si
  // todo el flujo termina bien) y necesitan más margen.
  options?: { timeoutMs?: number },
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.actor_id', ${context.actorId}, true)`);
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.roles', ${JSON.stringify(context.roles)}, true)`);
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.request_id', ${context.requestId}, true)`);
    return action(tx);
  }, options?.timeoutMs ? { timeout: options.timeoutMs } : undefined);
}

export async function resolveActor(sub: string): Promise<string> {
  const actor = await prisma.actor.upsert({
    where: { keycloakSub: sub },
    create: { keycloakSub: sub },
    update: {},
    select: { id: true },
  });
  return actor.id;
}
