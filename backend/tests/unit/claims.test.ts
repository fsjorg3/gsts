import { describe, expect, it } from 'vitest';
import { resolveSicefClaims } from '../../src/modules/auth/claims.js';

describe('resolveSicefClaims', () => {
  it('conserva únicamente los claims autorizados de cliente y realm', () => {
    expect(resolveSicefClaims({
      sub: 'subject-1',
      resource_access: { sicef: { roles: ['ventanilla', 'otro'] } },
      realm_access: { roles: ['ti'] },
    })).toEqual({ sub: 'subject-1', roles: ['ventanilla', 'ti'] });
  });

  it('rechaza tokens sin roles SICEF', () => {
    expect(() => resolveSicefClaims({ sub: 'subject-1', realm_access: { roles: ['otro'] } })).toThrow('rol autorizado');
  });

  it('ignora roles colocados en la fuente equivocada', () => {
    // `ti` sólo es válido desde realm_access; aquí llega por resource_access y debe ignorarse.
    // `ventanilla` sólo es válido desde resource_access; aquí llega por realm_access y debe ignorarse.
    expect(() => resolveSicefClaims({
      sub: 'subject-2',
      resource_access: { sicef: { roles: ['ti'] } },
      realm_access: { roles: ['ventanilla'] },
    })).toThrow('rol autorizado');
  });

  it('separa correctamente roles de cliente y de realm en un token mixto', () => {
    expect(resolveSicefClaims({
      sub: 'subject-3',
      resource_access: { sicef: { roles: ['ventanilla', 'ti', 'finanzas'] } },
      realm_access: { roles: ['direccion', 'finanzas'] },
    })).toEqual({ sub: 'subject-3', roles: ['ventanilla', 'finanzas', 'direccion'] });
  });
});
