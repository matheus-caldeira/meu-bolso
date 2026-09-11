import { describe, expect, it } from 'vitest';
import type { BusinessTypeDefinition } from './business-type.entity';
import { declaredKeys, filledExtra, splitExtra } from './business-type.rules';

const def: BusinessTypeDefinition = {
  id: 'scout',
  rules: { ordering: 'required', payment: 'deferred' },
  fields: {
    business: [{ key: 'group', kind: 'text' }],
    customer: [
      { key: 'section', kind: 'select', options: ['lobinho'] },
      { key: 'guardian', kind: 'text' },
    ],
  },
};

describe('declaredKeys', () => {
  it('extrai keys do escopo customer na ordem', () => {
    expect(declaredKeys(def, 'customer')).toEqual(['section', 'guardian']);
  });
  it('extrai keys do escopo business', () => {
    expect(declaredKeys(def, 'business')).toEqual(['group']);
  });
});

describe('filledExtra', () => {
  it('mantém só as declaradas com valor, na ordem do tipo de negócio', () => {
    expect(
      filledExtra(def, 'customer', { guardian: 'Ana', section: 'lobinho' }),
    ).toEqual([
      { key: 'section', value: 'lobinho' },
      { key: 'guardian', value: 'Ana' },
    ]);
  });

  it('descarta vazias, em branco e não declaradas', () => {
    expect(
      filledExtra(def, 'customer', {
        section: '   ',
        guardian: 'Ana',
        color: 'azul',
      }),
    ).toEqual([{ key: 'guardian', value: 'Ana' }]);
  });

  it('devolve lista vazia quando o escopo não tem campos preenchidos', () => {
    expect(filledExtra(def, 'customer', {})).toEqual([]);
  });
});

describe('splitExtra', () => {
  it('declaradas vão para inline na ordem, mesmo vazias', () => {
    const result = splitExtra({ section: 'lobinho' }, ['section', 'guardian']);
    expect(result.inline).toEqual([
      { key: 'section', value: 'lobinho' },
      { key: 'guardian', value: '' },
    ]);
    expect(result.orphans).toEqual([]);
  });
  it('não-declaradas com valor vão para orphans', () => {
    const result = splitExtra({ section: 'lobinho', color: 'azul' }, [
      'section',
    ]);
    expect(result.orphans).toEqual([{ key: 'color', value: 'azul' }]);
  });
  it('ignora não-declaradas com valor vazio', () => {
    const result = splitExtra({ color: '' }, ['section']);
    expect(result.orphans).toEqual([]);
  });
});
