import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/errors.js';
import { traducirErrorPrisma } from '../../src/shared/prisma-errors.js';

// Las formas de `meta` de estas pruebas NO son inventadas: se capturaron
// provocando cada error contra una base real con Prisma 7 y el driver adapter
// @prisma/adapter-pg. Si una actualización de Prisma cambia la envoltura, estas
// pruebas fallan — que es exactamente lo que debe pasar, porque el traductor
// dejaría de reconocer los errores y todo volvería a salir como 500.

function errorPrisma(code: string, meta: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mensaje interno con la consulta y la ruta del archivo', {
    code,
    clientVersion: '7.0.0',
    meta,
  });
}

const adaptador = (cause: Record<string, unknown>) => ({ driverAdapterError: { name: 'DriverAdapterError', cause } });

describe('traducirErrorPrisma', () => {
  it('traduce una violación de unicidad e informa los campos en conflicto', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2002', {
      modelName: 'GrupoRequisito',
      ...adaptador({
        originalCode: '23505',
        originalMessage: 'duplicate key value violates unique constraint "grupo_requisito_version_catalogo_id_clave_key"',
        kind: 'UniqueConstraintViolation',
        constraint: { fields: ['version_catalogo_id', 'clave'] },
      }),
    }));

    expect(traducido).toBeInstanceOf(AppError);
    expect(traducido?.status).toBe(409);
    expect(traducido?.code).toBe('UNIQUE_CONFLICT');
    expect(traducido?.message).toContain('clave');
    expect(traducido?.details).toEqual({ campos: ['version_catalogo_id', 'clave'], modelo: 'GrupoRequisito' });
  });

  it('traduce una violación de unicidad aunque el adaptador no diga qué campos', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2002', { modelName: 'VersionCatalogo' }));
    expect(traducido?.code).toBe('UNIQUE_CONFLICT');
    expect(traducido?.details).toBeUndefined();
  });

  it('traduce una violación de llave foránea', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2003', {
      modelName: 'GrupoRequisito',
      ...adaptador({ originalCode: '23503', kind: 'ForeignKeyConstraintViolation', constraint: { index: 'grupo_requisito_version_catalogo_id_fkey' } }),
    }));
    expect(traducido?.status).toBe(409);
    expect(traducido?.code).toBe('REFERENCE_CONFLICT');
  });

  it('traduce la fila inexistente a 404', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2025', { modelName: 'GrupoRequisito', operation: 'an update' }));
    expect(traducido?.status).toBe(404);
    expect(traducido?.code).toBe('NOT_FOUND');
  });

  // P2039 es el cajón genérico de «error de base de datos» de Prisma 7: por ahí
  // entran tanto los triggers como los CHECK, y sólo el SQLSTATE los separa.
  it('reenvía el mensaje de un trigger de negocio', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2039', {
      modelName: 'GrupoRequisito',
      ...adaptador({ originalCode: 'P0001', originalMessage: 'No se inserta ni mueve estructura a un catalogo publicado', kind: 'postgres' }),
    }));
    expect(traducido?.status).toBe(409);
    expect(traducido?.code).toBe('RULE_VIOLATION');
    expect(traducido?.message).toBe('No se inserta ni mueve estructura a un catalogo publicado');
  });

  it('no reenvía el mensaje de un CHECK, que nombra la restricción y arrastra la fila completa', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2039', {
      modelName: 'Tarifa',
      ...adaptador({
        originalCode: '23514',
        originalMessage: 'new row for relation "tarifa" violates check constraint "chk_tarifa_monto"',
        detail: 'Failing row contains (39d84ef1-…, NO_REGISTRO, X, 0.00, 990, f, f, null, null, …).',
      }),
    }));
    expect(traducido?.status).toBe(422);
    expect(traducido?.code).toBe('RULE_VIOLATION');
    expect(traducido?.message).not.toContain('chk_tarifa_monto');
    expect(traducido?.message).not.toContain('Failing row');
  });

  it('descarta un mensaje de trigger desmedido en vez de reenviarlo', () => {
    const traducido = traducirErrorPrisma(errorPrisma('P2039', {
      ...adaptador({ originalCode: 'P0001', originalMessage: 'x'.repeat(500) }),
    }));
    expect(traducido?.code).toBe('RULE_VIOLATION');
    expect(traducido?.message).not.toContain('xxxxx');
  });

  it('no traduce un error de base que no reconoce', () => {
    expect(traducirErrorPrisma(errorPrisma('P2039', { ...adaptador({ originalCode: '40001' }) }))).toBeUndefined();
  });

  it('no traduce códigos de Prisma que no mapea', () => {
    expect(traducirErrorPrisma(errorPrisma('P1001', {}))).toBeUndefined();
  });

  // Sin esto, cualquier error del proceso se convertiría en un 4xx que le echa
  // la culpa al cliente. Un 500 honesto es preferible.
  it('deja pasar lo que no es un error de Prisma', () => {
    expect(traducirErrorPrisma(new Error('cualquier cosa'))).toBeUndefined();
    expect(traducirErrorPrisma(undefined)).toBeUndefined();
    expect(traducirErrorPrisma({ code: 'P2002' })).toBeUndefined();
  });
});
