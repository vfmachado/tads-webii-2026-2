import type { Task } from '../domain/Task.js';
import type { TaskSnapshot } from '../domain/Task.js';

/**
 * VIEW — decide como uma Task (ou uma lista delas) vira a representação
 * que sai pela API. Este arquivo produz duas representações da mesma
 * Task: JSON (para `GET /tasks`) e um "view model" para HTML (para
 * `GET /`, renderizado por `views/tasks.ejs`).
 *
 * Reparem que quem formata status ("Concluída"/"Pendente") e data
 * (`toLocaleDateString`) é a View, não o Controller (que só orquestra)
 * nem o template (que só imprime). O `.ejs` recebe dados já prontos —
 * comparem com `antes/src/views/tasks.ejs`, onde essa formatação vive
 * dentro do próprio template.
 */

export function renderTask(task: Task): TaskSnapshot {
  return task.toSnapshot();
}

export function renderTaskList(tasks: Task[]): TaskSnapshot[] {
  return tasks.map(renderTask);
}

export function renderError(message: string): { error: string } {
  return { error: message };
}

export interface TaskViewModel {
  id: string;
  title: string;
  statusLabel: string;
  createdAtLabel: string;
}

export function toTaskViewModel(task: TaskSnapshot): TaskViewModel {
  return {
    id: task.id,
    title: task.title,
    statusLabel: task.status === 'done' ? 'Concluída ✅' : 'Pendente ⏳',
    createdAtLabel: new Date(task.createdAt).toLocaleDateString('pt-BR'),
  };
}

export function toTaskListViewModel(tasks: TaskSnapshot[]): TaskViewModel[] {
  return tasks.map(toTaskViewModel);
}
