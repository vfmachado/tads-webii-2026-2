import { Column, type ColumnSnapshot } from './Column.js';
import { ColumnNotFoundError } from './errors.js';
import { NotImplementedError } from '../shared/errors.js';

export interface BoardSnapshot {
  id: string;
  name: string;
  columns: ColumnSnapshot[];
}

/**
 * MODEL — o quadro (aggregate root): agrupa as colunas. Nesta versão do
 * template só existe UM quadro fixo (ver `src/seed.ts`); suportar vários
 * quadros é uma atividade de estica (Atividade 10).
 */
export class Board {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _columns: Column[],
  ) {}

  static create(id: string, name: string, columns: Column[]): Board {
    return new Board(id, name, columns);
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get columns(): readonly Column[] {
    return this._columns;
  }

  findColumn(columnId: string): Column {
    const column = this._columns.find((c) => c.id === columnId);
    if (!column) {
      throw new ColumnNotFoundError(columnId);
    }
    return column;
  }

  hasColumn(columnId: string): boolean {
    return this._columns.some((c) => c.id === columnId);
  }

  /**
   * TODO (Atividade 7): criar e adicionar uma nova coluna ao quadro.
   * Pontos a decidir: como gerar o `id`, qual `order` atribuir (última
   * posição?) e se nomes de coluna duplicados devem ser proibidos.
   */
  addColumn(_name: string, _wipLimit: number | null = null): Column {
    throw new NotImplementedError('Board#addColumn');
  }

  toSnapshot(): BoardSnapshot {
    return {
      id: this._id,
      name: this._name,
      columns: this._columns.map((c) => c.toSnapshot()).sort((a, b) => a.order - b.order),
    };
  }
}
