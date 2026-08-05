import type { Prisma } from '@prisma/client';
import type { DatabaseContext } from '../../infrastructure/database/prisma.js';

export async function auditarUsuario(
  tx: Prisma.TransactionClient,
  context: DatabaseContext & { ipAddress: string; userAgent: string },
  input: { entidad: string; entidadId: string; accion: string; estadoAnterior?: string | null; estadoNuevo?: string | null; detalle?: Prisma.InputJsonValue },
): Promise<void> {
  await tx.bitacora.create({
    data: {
      actorId: context.actorId,
      rolesSnapshot: context.roles,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      origen: 'USUARIO',
      entidad: input.entidad,
      entidadId: input.entidadId,
      accion: input.accion,
      estadoAnterior: input.estadoAnterior,
      estadoNuevo: input.estadoNuevo,
      detalle: input.detalle,
      requestId: context.requestId,
    },
  });
}
