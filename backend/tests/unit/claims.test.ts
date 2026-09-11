import { describe, expect, it } from 'vitest';
import { resolveGstsClaims } from '../../src/modules/auth/claims.js';

describe('resolveGstsClaims', () => {
  it('conserva únicamente los claims autorizados de cliente y realm', () => {
    expect(resolveGstsClaims({
      sub: 'subject-1',
      resource_access: { gsts: { roles: ['ventanilla', 'otro'] } },
      realm_access: { roles: ['ti'] },
    }, 'gsts')).toEqual({ sub: 'subject-1', roles: ['ventanilla', 'ti'] });
  });

  it('rechaza tokens sin roles GSTS', () => {
    expect(() => resolveGstsClaims({ sub: 'subject-1', realm_access: { roles: ['otro'] } }, 'gsts')).toThrow('rol autorizado');
  });

  it('ignora roles colocados en la fuente equivocada', () => {
    // `ti` sólo es válido desde realm_access; aquí llega por resource_access y debe ignorarse.
    // `ventanilla` sólo es válido desde resource_access; aquí llega por realm_access y debe ignorarse.
    expect(() => resolveGstsClaims({
      sub: 'subject-2',
      resource_access: { gsts: { roles: ['ti'] } },
      realm_access: { roles: ['ventanilla'] },
    }, 'gsts')).toThrow('rol autorizado');
  });

  it('separa correctamente roles de cliente y de realm en un token mixto', () => {
    expect(resolveGstsClaims({
      sub: 'subject-3',
      resource_access: { gsts: { roles: ['ventanilla', 'ti', 'consulta-cobros'] } },
      realm_access: { roles: ['direccion', 'consulta-cobros'] },
    }, 'gsts')).toEqual({ sub: 'subject-3', roles: ['ventanilla', 'consulta-cobros', 'direccion'] });
  });

  it('ya no reconoce el rol finanzas: pertenece al sistema de facturación', () => {
    // Tras el recorte, un token que sólo traiga `finanzas` no autentica en GSTS.
    expect(() => resolveGstsClaims({
      sub: 'subject-4',
      resource_access: { gsts: { roles: ['finanzas'] } },
    }, 'gsts')).toThrow('rol autorizado');
  });

  it('jefatura sólo es válido desde resource_access.<clienteId>.roles, nunca desde realm_access', () => {
    // GET /tramites/export exige exactamente esto: un jefatura puesto por
    // error en el realm no debe habilitar la exportación.
    expect(resolveGstsClaims({
      sub: 'subject-6',
      resource_access: { gsts: { roles: ['jefatura'] } },
    }, 'gsts')).toEqual({ sub: 'subject-6', roles: ['jefatura'] });

    expect(() => resolveGstsClaims({
      sub: 'subject-7',
      realm_access: { roles: ['jefatura'] },
    }, 'gsts')).toThrow('rol autorizado');
  });

  it('portal-institucional sólo es válido desde realm_access.roles, nunca desde resource_access', () => {
    // El backend del portal institucional llega con un rol de realm, como
    // ti/direccion — no de cliente, a diferencia de consulta-cobros/consulta-metricas.
    expect(resolveGstsClaims({
      sub: 'subject-8',
      realm_access: { roles: ['portal-institucional'] },
    }, 'gsts')).toEqual({ sub: 'subject-8', roles: ['portal-institucional'] });

    expect(() => resolveGstsClaims({
      sub: 'subject-9',
      resource_access: { gsts: { roles: ['portal-institucional'] } },
    }, 'gsts')).toThrow('rol autorizado');
  });

  it('usa el clienteId configurado, no un nombre fijo: ignora roles bajo otro client_id', () => {
    // Si el token trae los roles bajo un client_id distinto al configurado
    // (p. ej. resabios de 'sicef' mientras se termina la migración), no cuentan.
    expect(() => resolveGstsClaims({
      sub: 'subject-5',
      resource_access: { sicef: { roles: ['ventanilla'] } },
    }, 'gsts')).toThrow('rol autorizado');
  });
});
