import { Board } from '../../src/boards/Board.js';
import { Column } from '../../src/boards/Column.js';
import { InMemoryBoardRepository } from '../../src/boards/BoardRepository.js';
import { InMemoryCardRepository } from '../../src/cards/CardRepository.js';
import type { SeededRepositories } from '../../src/seed.js';

/**
 * Fixture pequena e controlada para testes de rota/integração — de
 * propósito, NÃO usa os dados de `src/seed.ts`. Isso mantém esses testes
 * estáveis mesmo que o quadro semeado mude; só o teste e2e
 * (`test/e2e/board.e2e.test.ts`) depende do conteúdo real do seed, porque
 * é o único que testa "o estado inicial hard-coded" propriamente dito.
 */
export function buildTestRepositories(): SeededRepositories {
  const board = Board.create('board-1', 'Quadro de Teste', [
    Column.create('col-1', 'Coluna 1', 1),
    Column.create('col-2', 'Coluna 2', 2),
  ]);
  return {
    boardRepository: new InMemoryBoardRepository(board),
    cardRepository: new InMemoryCardRepository(),
  };
}
