import { describe, expect, it } from 'vitest';
import { Column } from '../../../src/boards/Column.js';
import { InvalidColumnNameError } from '../../../src/boards/errors.js';

describe('Column.create', () => {
  it('cria uma coluna válida com wipLimit padrão nulo', () => {
    const column = Column.create('col-1', '  A Fazer  ', 1);

    expect(column.name).toBe('A Fazer');
    expect(column.order).toBe(1);
    expect(column.wipLimit).toBeNull();
  });

  it('aceita um wipLimit explícito', () => {
    const column = Column.create('col-2', 'Em Andamento', 2, 3);

    expect(column.wipLimit).toBe(3);
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    expect(() => Column.create('col-3', 'A', 1)).toThrow(InvalidColumnNameError);
  });

  it('rejeita nome com mais de 40 caracteres', () => {
    expect(() => Column.create('col-4', 'a'.repeat(41), 1)).toThrow(InvalidColumnNameError);
  });

  it('rejeita nome que não é string', () => {
    // @ts-expect-error propositalmente passando um tipo inválido
    expect(() => Column.create('col-5', 123, 1)).toThrow(InvalidColumnNameError);
  });
});

describe('Column#toSnapshot', () => {
  it('expõe os dados da coluna', () => {
    const column = Column.create('col-1', 'A Fazer', 1, 5);

    expect(column.toSnapshot()).toEqual({ id: 'col-1', name: 'A Fazer', order: 1, wipLimit: 5 });
  });
});
