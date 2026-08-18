import type { Prisma } from '@prisma/client';
import { AppError } from '../../../shared/errors.js';

// Único punto que traduce motivoReduccionId → porcentaje: el backend nunca
// confía en un porcentaje enviado por el cliente, siempre lo deriva y
// congela desde el catálogo (o 0 si no se eligió motivo).
export async function resolverMotivoReduccion(
  tx: Prisma.TransactionClient,
  motivoReduccionId: string | null | undefined,
): Promise<{ motivoReduccionId: string | null; porcentajeReduccion: number }> {
  if (!motivoReduccionId) return { motivoReduccionId: null, porcentajeReduccion: 0 };
  const motivo = await tx.motivoReduccion.findFirst({ where: { id: motivoReduccionId, activo: true } });
  if (!motivo) throw new AppError(422, 'VALIDATION_ERROR', 'El motivo de reducción no existe o ya no está activo');
  return { motivoReduccionId: motivo.id, porcentajeReduccion: Number(motivo.porcentaje) };
}
