import { describe, expect, it } from 'vitest';
import { gruposAplicables, type VersionCatalogoConArbol } from '@/features/catalogos/api';
import { checklistSatisfecho } from './ChecklistRequisitos';

type Grupo = VersionCatalogoConArbol['grupos'][number];

const doc = (id: string) => ({ id, opcionId: 'o', nombre: id, orden: 0 });
const grupo = (over: Partial<Grupo> = {}): Grupo => ({
  id: 'g1',
  versionCatalogoId: 'v1',
  clave: 'ID',
  nombre: 'Identificación',
  orden: 0,
  aplicaTipo: null,
  aplicaPersonalidad: null,
  aplicaRepresentacion: null,
  opciones: [{ id: 'o1', grupoId: 'g1', clave: 'INE', nombre: 'INE', orden: 0, documentos: [doc('d1')] }],
  ...over,
});

const catalogo = (grupos: Grupo[]): VersionCatalogoConArbol => ({
  id: 'v1', version: 1, publicada: true, activa: true, vigenteDesde: null, vigenteHasta: null, createdAt: '', grupos,
});

describe('gruposAplicables — regla Y/O/Y del contrato (NULL = sin filtro)', () => {
  const filtro = { tipoConstancia: 'NO_ADEUDO', personalidad: 'FISICA', representacion: 'TITULAR' } as const;

  it('incluye grupos sin filtros y los que coinciden en toda dimensión', () => {
    const aplicables = gruposAplicables(
      catalogo([grupo(), grupo({ id: 'g2', aplicaTipo: 'NO_ADEUDO', aplicaPersonalidad: 'FISICA' })]),
      filtro,
    );
    expect(aplicables.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('excluye grupos cuyo filtro no coincide en alguna dimensión', () => {
    const aplicables = gruposAplicables(
      catalogo([grupo({ id: 'g2', aplicaTipo: 'NO_REGISTRO' }), grupo({ id: 'g3', aplicaRepresentacion: 'APODERADO' })]),
      filtro,
    );
    expect(aplicables).toEqual([]);
  });
});

describe('checklistSatisfecho — Y entre grupos, O entre opciones, Y entre documentos', () => {
  it('satisfecho cuando cada grupo tiene una opción con todos sus documentos VALIDADOS', () => {
    const g = grupo();
    expect(checklistSatisfecho([g], new Map([['d1', { estado: 'VALIDADO' }]]))).toBe(true);
  });

  it('no satisfecho con evidencia sólo CARGADA o faltante', () => {
    const g = grupo();
    expect(checklistSatisfecho([g], new Map([['d1', { estado: 'CARGADO' }]]))).toBe(false);
    expect(checklistSatisfecho([g], new Map())).toBe(false);
  });

  it('una opción alternativa completa satisface el grupo (O)', () => {
    const g = grupo({
      opciones: [
        { id: 'o1', grupoId: 'g1', clave: 'INE', nombre: 'INE', orden: 0, documentos: [doc('d1'), doc('d2')] },
        { id: 'o2', grupoId: 'g1', clave: 'PAS', nombre: 'Pasaporte', orden: 1, documentos: [doc('d3')] },
      ],
    });
    // d1 incompleto pero d3 (opción alterna) validado → grupo satisfecho.
    expect(checklistSatisfecho([g], new Map([['d1', { estado: 'VALIDADO' }], ['d3', { estado: 'VALIDADO' }]]))).toBe(true);
  });

  it('una opción sin documentos no puede satisfacer un grupo', () => {
    const g = grupo({ opciones: [{ id: 'o1', grupoId: 'g1', clave: 'X', nombre: 'X', orden: 0, documentos: [] }] });
    expect(checklistSatisfecho([g], new Map())).toBe(false);
  });

  it('todos los grupos deben satisfacerse (Y)', () => {
    const g1 = grupo();
    const g2 = grupo({ id: 'g2', opciones: [{ id: 'o2', grupoId: 'g2', clave: 'CP', nombre: 'Comprobante', orden: 0, documentos: [doc('d9')] }] });
    expect(checklistSatisfecho([g1, g2], new Map([['d1', { estado: 'VALIDADO' }]]))).toBe(false);
  });
});
