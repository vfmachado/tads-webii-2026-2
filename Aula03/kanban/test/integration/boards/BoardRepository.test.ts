import { describe, expect, it } from 'vitest';
import { Board } from '../../../src/boards/Board.js';
import { Column } from '../../../src/boards/Column.js';
import { InMemoryBoardRepository } from '../../../src/boards/BoardRepository.js';

describe('InMemoryBoardRepository', () => {
  it('devolve sempre o mesmo quadro passado na construção', () => {
    const board = Board.create('board-1', 'Quadro de Teste', [Column.create('col-1', 'A Fazer', 1)]);
    const repository = new InMemoryBoardRepository(board);

    expect(repository.getDefault()).toBe(board);
    expect(repository.getDefault().name).toBe('Quadro de Teste');
  });
});
