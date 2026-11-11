import type { TaskRepository } from '../../application/ports/TaskRepository.js';
import type { Task } from '../../domain/Task.js';

/** Adaptador para testes unitários: sem banco, sem rede. */
export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = [];
  private nextId = 1;

  async list(): Promise<Task[]> {
    return [...this.tasks].sort((a, b) => b.id - a.id);
  }

  async add(title: string): Promise<Task> {
    const task: Task = { id: this.nextId++, title, done: false, createdAt: new Date(), doneAt: null };
    this.tasks.push(task);
    return { ...task };
  }

  async setDone(id: number, done: boolean): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.done = done;
    task.doneAt = done ? new Date() : null;
    return { ...task };
  }

  async remove(id: number): Promise<boolean> {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return this.tasks.length < before;
  }
}
