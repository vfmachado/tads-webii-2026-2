import { Board } from './boards/Board.js';
import { Column } from './boards/Column.js';
import { InMemoryBoardRepository } from './boards/BoardRepository.js';
import { Card, type CardPriority } from './cards/Card.js';
import { InMemoryCardRepository } from './cards/CardRepository.js';

export interface SeededRepositories {
  boardRepository: InMemoryBoardRepository;
  cardRepository: InMemoryCardRepository;
}

interface SeedCard {
  title: string;
  columnId: string;
  priority: CardPriority;
  description?: string;
}

const COLUMN_TODO = 'col-todo';
const COLUMN_DOING = 'col-doing';
const COLUMN_DONE = 'col-done';

/**
 * Dados iniciais hard-coded (é literalmente o único caso de uso que
 * funciona no estado inicial do template: ver essa lista renderizada em
 * `GET /`). Os cartões nas colunas "A Fazer"/"Em Andamento" não são só
 * dados de exemplo — são o próprio backlog de atividades da Aula 03
 * (comparem os títulos com aula03.md).
 */
const SEED_CARDS: SeedCard[] = [
  { title: 'Estruturar o projeto em módulos (boards/cards)', columnId: COLUMN_DONE, priority: 'média' },
  { title: 'Modelar Board, Column e Card com validação', columnId: COLUMN_DONE, priority: 'média' },
  { title: 'Renderizar o quadro inicial (hard-coded) com Tailwind', columnId: COLUMN_DONE, priority: 'baixa' },
  { title: 'Criar cartão (Atividade 1)', columnId: COLUMN_TODO, priority: 'alta', description: 'POST /cards' },
  {
    title: 'Mover cartão entre colunas (Atividade 2)',
    columnId: COLUMN_TODO,
    priority: 'alta',
    description: 'POST /cards/:id/move',
  },
  {
    title: 'Editar cartão (Atividade 3)',
    columnId: COLUMN_TODO,
    priority: 'alta',
    description: 'POST /cards/:id/update',
  },
  {
    title: 'Excluir cartão (Atividade 4)',
    columnId: COLUMN_TODO,
    priority: 'média',
    description: 'POST /cards/:id/delete',
  },
  { title: 'Aplicar limite de WIP em "Em Andamento" (Atividade 5)', columnId: COLUMN_TODO, priority: 'média' },
  {
    title: 'Impedir título duplicado na mesma coluna (Atividade 6)',
    columnId: COLUMN_TODO,
    priority: 'baixa',
  },
  {
    title: 'Criar novas colunas (Atividade 7)',
    columnId: COLUMN_TODO,
    priority: 'baixa',
    description: 'POST /columns',
  },
  { title: 'Escrever os testes da Atividade 1', columnId: COLUMN_DOING, priority: 'alta' },
];

export function createSeededRepositories(): SeededRepositories {
  const columns = [
    Column.create(COLUMN_TODO, 'A Fazer', 1),
    Column.create(COLUMN_DOING, 'Em Andamento', 2, 3),
    Column.create(COLUMN_DONE, 'Concluído', 3),
  ];
  const board = Board.create('board-1', 'Quadro do Projeto', columns);
  const boardRepository = new InMemoryBoardRepository(board);

  const cardRepository = new InMemoryCardRepository();
  for (const seedCard of SEED_CARDS) {
    cardRepository.save(
      Card.create(seedCard.title, seedCard.columnId, seedCard.priority, seedCard.description ?? ''),
    );
  }

  return { boardRepository, cardRepository };
}
