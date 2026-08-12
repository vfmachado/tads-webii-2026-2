import type { Board } from './Board.js';

/**
 * MODEL (persistência) — "banco em memória" do quadro. Só existe um quadro
 * por instância do repositório; suportar múltiplos quadros (Atividade 10)
 * exigiria trocar `getDefault()` por algo como `findById(id)`/`findAll()`.
 */
export interface BoardRepository {
  getDefault(): Board;
}

export class InMemoryBoardRepository implements BoardRepository {
  constructor(private readonly board: Board) {}

  getDefault(): Board {
    return this.board;
  }
}
