import { InvalidColumnNameError } from './errors.js';

export interface ColumnSnapshot {
  id: string;
  name: string;
  order: number;
  wipLimit: number | null;
}

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;

/**
 * MODEL — uma coluna do quadro (ex.: "A Fazer", "Em Andamento").
 * `wipLimit` é o número máximo de cartões permitidos na coluna ao mesmo
 * tempo (limite de "Work In Progress", conceito central de Kanban) — o
 * campo já existe, mas **ninguém aplica essa regra ainda** (Atividade 5).
 */
export class Column {
  private constructor(
    private readonly _id: string,
    private _name: string,
    private readonly _order: number,
    private readonly _wipLimit: number | null,
  ) {}

  static create(id: string, name: string, order: number, wipLimit: number | null = null): Column {
    const normalized = Column.validateName(name);
    return new Column(id, normalized, order, wipLimit);
  }

  private static validateName(name: string): string {
    if (typeof name !== 'string') {
      throw new InvalidColumnNameError('deve ser um texto');
    }
    const normalized = name.trim();
    if (normalized.length < MIN_NAME_LENGTH || normalized.length > MAX_NAME_LENGTH) {
      throw new InvalidColumnNameError(
        `deve ter entre ${MIN_NAME_LENGTH} e ${MAX_NAME_LENGTH} caracteres`,
      );
    }
    return normalized;
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get order(): number {
    return this._order;
  }

  get wipLimit(): number | null {
    return this._wipLimit;
  }

  toSnapshot(): ColumnSnapshot {
    return { id: this._id, name: this._name, order: this._order, wipLimit: this._wipLimit };
  }
}
