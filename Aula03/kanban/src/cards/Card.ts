import { randomUUID } from 'node:crypto';
import { InvalidCardColumnError, InvalidCardTitleError, InvalidPriorityError } from './errors.js';
import { NotImplementedError } from '../shared/errors.js';

export type CardPriority = 'baixa' | 'média' | 'alta';

export interface CardSnapshot {
  id: string;
  title: string;
  description: string;
  priority: CardPriority;
  columnId: string;
  createdAt: string;
}

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 120;
const VALID_PRIORITIES: readonly CardPriority[] = ['baixa', 'média', 'alta'];

/**
 * MODEL — um cartão do quadro. Só sabe validar seus próprios dados
 * (título, prioridade, coluna informada) — não sabe se a coluna
 * (`columnId`) de fato existe no quadro; essa é uma regra que atravessa
 * dois módulos (`cards` depende de `boards` para validar isso) e por isso
 * fica no Controller, não aqui (mesma discussão da Aula 02 sobre onde mora
 * cada regra).
 */
export class Card {
  private constructor(
    private readonly _id: string,
    private _title: string,
    private _description: string,
    private _priority: CardPriority,
    private _columnId: string,
    private readonly _createdAt: string,
  ) {}

  static create(title: string, columnId: string, priority: CardPriority = 'baixa', description = ''): Card {
    const normalizedTitle = Card.validateTitle(title);
    const normalizedColumnId = Card.validateColumnId(columnId);
    const normalizedPriority = Card.validatePriority(priority);
    return new Card(
      randomUUID(),
      normalizedTitle,
      description.trim(),
      normalizedPriority,
      normalizedColumnId,
      new Date().toISOString(),
    );
  }

  /** Reconstrói uma instância a partir de dados já persistidos. */
  static restore(snapshot: CardSnapshot): Card {
    return new Card(
      snapshot.id,
      snapshot.title,
      snapshot.description,
      snapshot.priority,
      snapshot.columnId,
      snapshot.createdAt,
    );
  }

  private static validateTitle(title: string): string {
    if (typeof title !== 'string') {
      throw new InvalidCardTitleError('deve ser um texto');
    }
    const normalized = title.trim();
    if (normalized.length < MIN_TITLE_LENGTH || normalized.length > MAX_TITLE_LENGTH) {
      throw new InvalidCardTitleError(
        `deve ter entre ${MIN_TITLE_LENGTH} e ${MAX_TITLE_LENGTH} caracteres`,
      );
    }
    return normalized;
  }

  private static validateColumnId(columnId: string): string {
    if (typeof columnId !== 'string' || columnId.trim().length === 0) {
      throw new InvalidCardColumnError('columnId é obrigatório');
    }
    return columnId;
  }

  private static validatePriority(priority: CardPriority): CardPriority {
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new InvalidPriorityError(priority);
    }
    return priority;
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get priority(): CardPriority {
    return this._priority;
  }

  get columnId(): string {
    return this._columnId;
  }

  /**
   * TODO (Atividade 2): mover o cartão para outra coluna. Pontos a
   * decidir: quem valida se `newColumnId` existe no quadro (o Card não
   * conhece o Board) e como aplicar o limite de WIP da coluna destino
   * (Atividade 5) sem o Card também precisar conhecer o Board.
   */
  changeColumn(_newColumnId: string): void {
    throw new NotImplementedError('Card#changeColumn');
  }

  /** TODO (Atividade 3): renomear e/ou trocar a descrição do cartão. */
  rename(_newTitle: string, _newDescription?: string): void {
    throw new NotImplementedError('Card#rename');
  }

  /** TODO (Atividade 3): trocar a prioridade do cartão. */
  changePriority(_priority: CardPriority): void {
    throw new NotImplementedError('Card#changePriority');
  }

  toSnapshot(): CardSnapshot {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      priority: this._priority,
      columnId: this._columnId,
      createdAt: this._createdAt,
    };
  }
}
