import { Task } from '../domain/Task.js';

/**
 * MODEL (parte de acesso a dados) — interface que o Controller depende.
 * Hoje só existe uma implementação em memória; trocar por um banco de
 * verdade (assunto da Aula 07) não deveria exigir tocar no Controller.
 */
export interface TaskRepository {
  save(task: Task): void;
  findAll(): Task[];
  findById(id: string): Task | undefined;
  existsPendingWithTitle(title: string, excludeId?: string): boolean;
  delete(id: string): void;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  save(task: Task): void {
    this.tasks.set(task.id, task);
  }

  findAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  existsPendingWithTitle(title: string, excludeId?: string): boolean {
    const normalized = title.trim().toLowerCase();
    return Array.from(this.tasks.values()).some(
      (task) =>
        task.id !== excludeId && task.status === 'pending' && task.title.toLowerCase() === normalized,
    );
  }

  delete(id: string): void {
    this.tasks.delete(id);
  }
}
