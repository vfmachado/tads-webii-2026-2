import { describe, expect, it } from 'vitest';
import { Board } from '../../../src/boards/Board.js';
import { Column } from '../../../src/boards/Column.js';
import { ColumnNotFoundError } from '../../../src/boards/errors.js';
import { NotImplementedError } from '../../../src/shared/errors.js';

function buildBoard(): Board {
  const columns = [
    Column.create('col-todo', 'A Fazer', 1),
    Column.create('col-doing', 'Em Andamento', 2, 3),
  ];
  return Board.create('board-1', 'Quadro de Teste', columns);
}

describe('Board — getters básicos', () => {
  it('expõe id e a lista de colunas', () => {
    const board = buildBoard();

    expect(board.id).toBe('board-1');
    expect(board.columns).toHaveLength(2);
  });
});

describe('Board#findColumn', () => {
  it('retorna a coluna quando ela existe', () => {
    const board = buildBoard();

    expect(board.findColumn('col-todo').name).toBe('A Fazer');
  });

  it('lança ColumnNotFoundError quando a coluna não existe', () => {
    const board = buildBoard();

    expect(() => board.findColumn('col-inexistente')).toThrow(ColumnNotFoundError);
  });
});

describe('Board#hasColumn', () => {
  it('retorna true quando a coluna existe', () => {
    expect(buildBoard().hasColumn('col-doing')).toBe(true);
  });

  it('retorna false quando a coluna não existe', () => {
    expect(buildBoard().hasColumn('col-inexistente')).toBe(false);
  });
});

describe('Board#addColumn', () => {
  it('ainda não está implementado (Atividade 7)', () => {
    const board = buildBoard();

    expect(() => board.addColumn('Em Revisão')).toThrow(NotImplementedError);
  });
});

describe('Board#toSnapshot', () => {
  it('devolve as colunas ordenadas por order', () => {
    const columns = [Column.create('col-b', 'Segunda', 2), Column.create('col-a', 'Primeira', 1)];
    const board = Board.create('board-1', 'Quadro', columns);

    const snapshot = board.toSnapshot();

    expect(snapshot.columns.map((c) => c.id)).toEqual(['col-a', 'col-b']);
  });
});
