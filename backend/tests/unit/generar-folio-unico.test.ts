import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { generarFolioUnico } from '../../src/modules/constancias/constancias/folio.js';

function txCon(valor: number) {
  const queryRaw = vi.fn().mockResolvedValue([{ valor }]);
  return { tx: { $queryRaw: queryRaw } as unknown as Prisma.TransactionClient, queryRaw };
}

describe('generarFolioUnico', () => {
  it('arma el folio con el código fijo del tipo, el año y el consecutivo reservado', async () => {
    const { tx } = txCon(1);
    await expect(generarFolioUnico(tx, 'NO_REGISTRO', new Date('2026-07-24T18:00:00.000Z'))).resolves.toBe('GSTS-CNR-2026-1');
  });

  it('usa el código correspondiente para cada tipo de constancia', async () => {
    const { tx } = txCon(7);
    await expect(generarFolioUnico(tx, 'NO_ADEUDO', new Date('2026-07-24T18:00:00.000Z'))).resolves.toBe('GSTS-CNA-2026-7');
  });

  it('calcula el año en la zona horaria de Puebla, no en UTC', async () => {
    const { tx } = txCon(1);
    // 00:30 UTC del 1 de enero de 2027 sigue siendo 31 de diciembre de 2026 en Puebla.
    await expect(generarFolioUnico(tx, 'NO_REGISTRO', new Date('2027-01-01T00:30:00.000Z'))).resolves.toBe('GSTS-CNR-2026-1');
  });

  it('lanza si el UPSERT no devuelve fila (no debería pasar nunca en Postgres real)', async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]) } as unknown as Prisma.TransactionClient;
    await expect(generarFolioUnico(tx, 'NO_REGISTRO', new Date('2026-07-24T18:00:00.000Z'))).rejects.toThrow('No se pudo reservar el consecutivo del folio');
  });

  it('usa un único statement atómico (INSERT ... ON CONFLICT ... RETURNING) con id "{tipo}_{año}"', async () => {
    const { tx, queryRaw } = txCon(1);
    await generarFolioUnico(tx, 'NO_REGISTRO', new Date('2026-07-24T18:00:00.000Z'));
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const consulta = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(consulta.sql).toContain('ON CONFLICT');
    expect(consulta.sql).toContain('RETURNING');
    expect(consulta.values).toEqual(['NO_REGISTRO_2026']);
  });

  it('usa una fila de contador distinta por tipo de constancia y por año', async () => {
    const idUsado = async (tipo: 'NO_ADEUDO' | 'NO_REGISTRO', fecha: string) => {
      const { tx, queryRaw } = txCon(1);
      await generarFolioUnico(tx, tipo, new Date(fecha));
      return (queryRaw.mock.calls[0]?.[0] as { values: unknown[] }).values[0];
    };

    expect(await idUsado('NO_REGISTRO', '2026-01-01T12:00:00.000Z')).toBe('NO_REGISTRO_2026');
    expect(await idUsado('NO_ADEUDO', '2026-01-01T12:00:00.000Z')).toBe('NO_ADEUDO_2026');
    expect(await idUsado('NO_REGISTRO', '2027-01-01T12:00:00.000Z')).toBe('NO_REGISTRO_2027');
  });
});
