import { Task } from '../domain/Task.js';
import {
  DuplicateTaskTitleError,
  InvalidTaskTitleError,
  TaskAlreadyCompletedError,
  TaskNotFoundError,
} from '../domain/errors.js';
import type { TaskRepository } from '../repositories/TaskRepository.js';
import { renderError, renderTask, renderTaskList } from '../views/taskView.js';

export interface ControllerResult {
  status: number;
  body: unknown;
}

/**
 * CONTROLLER — orquestra a requisição: chama o Model (domínio + repositório),
 * decide o código HTTP e delega a formatação da resposta para a View.
 *
 * Importante: o Controller não conhece Express. Os métodos recebem dados já
 * extraídos (id, corpo da requisição) e devolvem um `ControllerResult`
 * simples — quem traduz isso para `res.status().json()` é `routes.ts`.
 * É essa separação que permite testar o Controller inteiro sem subir um
 * servidor HTTP (ver test/unit/TaskController.test.ts).
 */
export class TaskController {
  constructor(private readonly repository: TaskRepository) {}

  create(body: unknown): ControllerResult {
    // etapa de validacao no req.body
    const title = (body as { title?: unknown })?.title;
    try {
      const task = Task.create(title as string);
      if (this.repository.existsPendingWithTitle(task.title)) {
        throw new DuplicateTaskTitleError(task.title);
      }
      this.repository.save(task);
      return { status: 201, body: renderTask(task) };
    } catch (err) {
      return this.toErrorResult(err);
    }
  }

  list(): ControllerResult {
    return { status: 200, body: renderTaskList(this.repository.findAll()) };
  }

  getById(id: string): ControllerResult {
    const task = this.repository.findById(id);
    if (!task) {
      return this.toErrorResult(new TaskNotFoundError(id));
    }
    return { status: 200, body: renderTask(task) };
  }

  rename(id: string, body: unknown): ControllerResult {
    const task = this.repository.findById(id);
    if (!task) {
      return this.toErrorResult(new TaskNotFoundError(id));
    }

    const title = (body as { title?: unknown })?.title;
    try {
      if (typeof title === 'string' && this.repository.existsPendingWithTitle(title, id)) {
        throw new DuplicateTaskTitleError(title);
      }
      task.rename(title as string);
      this.repository.save(task);
      return { status: 200, body: renderTask(task) };
    } catch (err) {
      return this.toErrorResult(err);
    }
  }

  complete(id: string): ControllerResult {
    const task = this.repository.findById(id);
    if (!task) {
      return this.toErrorResult(new TaskNotFoundError(id));
    }
    try {
      task.complete();
      this.repository.save(task);
      return { status: 200, body: renderTask(task) };
    } catch (err) {
      return this.toErrorResult(err);
    }
  }

  remove(id: string): ControllerResult {
    const task = this.repository.findById(id);
    if (!task) {
      return this.toErrorResult(new TaskNotFoundError(id));
    }
    // Regra de aplicação (não é invariante do Model): não se apaga uma
    // tarefa concluída. Fica no Controller de propósito — é uma decisão
    // que a Aula 04 vai questionar ao introduzir uma camada de aplicação.
    if (task.status === 'done') {
      return this.toErrorResult(new TaskAlreadyCompletedError(id), 409, 'não é possível excluir uma tarefa concluída');
    }
    this.repository.delete(id);
    return { status: 204, body: null };
  }

  private toErrorResult(err: unknown, forcedStatus?: number, forcedMessage?: string): ControllerResult {
    if (forcedStatus) {
      return { status: forcedStatus, body: renderError(forcedMessage ?? (err as Error).message) };
    }
    if (err instanceof TaskNotFoundError) {
      return { status: 404, body: renderError(err.message) };
    }
    if (err instanceof InvalidTaskTitleError) {
      return { status: 400, body: renderError(err.message) };
    }
    if (err instanceof DuplicateTaskTitleError || err instanceof TaskAlreadyCompletedError) {
      return { status: 409, body: renderError(err.message) };
    }
    throw err;
  }
}
