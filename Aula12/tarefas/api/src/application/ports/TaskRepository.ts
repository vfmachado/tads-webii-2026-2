import type { Task } from '../../domain/Task.js';

/** Porta de saída: como a aplicação guarda tarefas (Postgres, memória...). */
export interface TaskRepository {
  list(): Promise<Task[]>;
  add(title: string): Promise<Task>;
  /** Devolve `null` se a tarefa não existe. */
  setDone(id: number, done: boolean): Promise<Task | null>;
  /** Devolve `false` se a tarefa não existe. */
  remove(id: number): Promise<boolean>;
}
