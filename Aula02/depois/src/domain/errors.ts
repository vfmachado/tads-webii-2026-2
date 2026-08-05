/**
 * Erros de domínio: falam a língua do negócio, não a língua do HTTP.
 * Quem decide o código de status é o Controller (`TaskController`), não o Model.
 */

export class InvalidTaskTitleError extends Error {
  constructor(reason: string) {
    super(`Título de tarefa inválido: ${reason}`);
    this.name = 'InvalidTaskTitleError';
  }
}

export class TaskAlreadyCompletedError extends Error {
  constructor(taskId: string) {
    super(`A tarefa ${taskId} já está concluída`);
    this.name = 'TaskAlreadyCompletedError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Tarefa ${taskId} não encontrada`);
    this.name = 'TaskNotFoundError';
  }
}

export class DuplicateTaskTitleError extends Error {
  constructor(title: string) {
    super(`Já existe uma tarefa pendente com o título "${title}"`);
    this.name = 'DuplicateTaskTitleError';
  }
}
