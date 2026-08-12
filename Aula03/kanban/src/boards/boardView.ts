import type { Board } from './Board.js';
import type { Card } from '../cards/Card.js';

/**
 * VIEW — transforma Board + Card (Model) num "view model" pronto para o
 * template `views/board/index.ejs` imprimir. Quem decide rótulo, classe de
 * cor e se uma coluna estourou o WIP é esta camada — não o template
 * (que só itera) nem o Controller (que só orquestra).
 */

export interface CardViewModel {
  id: string;
  title: string;
  description: string;
  priority: string;
  priorityBadgeClass: string;
}

export interface ColumnViewModel {
  id: string;
  name: string;
  wipLimit: number | null;
  cards: CardViewModel[];
  isOverWipLimit: boolean;
}

export interface BoardViewModel {
  id: string;
  name: string;
  columns: ColumnViewModel[];
}

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'alta':
      return 'bg-red-100 text-red-700';
    case 'média':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function toCardViewModel(card: Card): CardViewModel {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    priority: card.priority,
    priorityBadgeClass: priorityBadgeClass(card.priority),
  };
}

export function toBoardViewModel(board: Board, cards: Card[]): BoardViewModel {
  const snapshot = board.toSnapshot();

  return {
    id: snapshot.id,
    name: snapshot.name,
    columns: snapshot.columns.map((column) => {
      const columnCards = cards.filter((c) => c.columnId === column.id).map(toCardViewModel);
      return {
        id: column.id,
        name: column.name,
        wipLimit: column.wipLimit,
        cards: columnCards,
        isOverWipLimit: column.wipLimit !== null && columnCards.length > column.wipLimit,
      };
    }),
  };
}
