import { TaskNotFoundError } from '../domain/errors.js';
import { normalizeTitle, type Task } from '../domain/Task.js';
import type { TaskRepository } from './ports/TaskRepository.js';

/** Casos de uso (portas de entrada). */
export function createTaskUseCases(repo: TaskRepository) {
  return {
    list: (): Promise<Task[]> => repo.list(),

    create: (title: string): Promise<Task> => repo.add(normalizeTitle(title)),

    async setDone(id: number, done: boolean): Promise<Task> {
      const task = await repo.setDone(id, done);
      if (!task) throw new TaskNotFoundError(id);
      return task;
    },

    async remove(id: number): Promise<void> {
      if (!(await repo.remove(id))) throw new TaskNotFoundError(id);
    },
  };
}

export type TaskUseCases = ReturnType<typeof createTaskUseCases>;
