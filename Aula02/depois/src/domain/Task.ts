import { randomUUID } from 'node:crypto';
import { InvalidTaskTitleError, TaskAlreadyCompletedError } from './errors.js';

export type TaskStatus = 'pending' | 'done';

export interface TaskSnapshot {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 120;

/**
 * MODEL — a única fonte de verdade sobre o que é uma tarefa válida e o
 * que ela pode fazer. Não sabe nada de Express, HTTP ou JSON: é puro
 * TypeScript, testável sem subir servidor nenhum (ver test/unit/Task.test.ts).
 */
export class Task {
  private constructor(
    private readonly _id: string,
    private _title: string,
    private _status: TaskStatus,
    private readonly _createdAt: string,
  ) {}

  static create(title: string): Task {
    const normalized = Task.validateTitle(title);
    return new Task(randomUUID(), normalized, 'pending', new Date().toISOString());
  }

  /** Reconstrói uma instância a partir de dados já persistidos (não repete validação de criação). */
  static restore(snapshot: TaskSnapshot): Task {
    return new Task(snapshot.id, snapshot.title, snapshot.status, snapshot.createdAt);
  }

  private static validateTitle(title: string): string {
    if (typeof title !== 'string') {
      throw new InvalidTaskTitleError('deve ser um texto');
    }
    const normalized = title.trim();
    if (normalized.length < MIN_TITLE_LENGTH || normalized.length > MAX_TITLE_LENGTH) {
      throw new InvalidTaskTitleError(
        `deve ter entre ${MIN_TITLE_LENGTH} e ${MAX_TITLE_LENGTH} caracteres`,
      );
    }
    return normalized;
  }

  rename(newTitle: string): void {
    if (this._status === 'done') {
      throw new TaskAlreadyCompletedError(this._id);
    }
    this._title = Task.validateTitle(newTitle);
  }

  complete(): void {
    if (this._status === 'done') {
      throw new TaskAlreadyCompletedError(this._id);
    }
    this._status = 'done';
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get status(): TaskStatus {
    return this._status;
  }

  toSnapshot(): TaskSnapshot {
    return { id: this._id, title: this._title, status: this._status, createdAt: this._createdAt };
  }
}
