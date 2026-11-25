export class InvalidTaskTitleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTaskTitleError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(public readonly id: number) {
    super(`Tarefa ${id} não encontrada`);
    this.name = 'TaskNotFoundError';
  }
}
