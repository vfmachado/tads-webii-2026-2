/**
 * HEXAGONAL: domínio (núcleo). Erros de negócio do módulo de projetos —
 * nada aqui sabe o que é HTTP; a tradução para status code é
 * responsabilidade exclusiva de `shared/http/errorHandler.ts`.
 */
export class ProjectNotFoundError extends Error {
  constructor(id: number) {
    super(`Projeto ${id} não encontrado`);
    this.name = 'ProjectNotFoundError';
  }
}

export class EmptyStageListError extends Error {
  constructor() {
    super('Um projeto precisa de pelo menos uma etapa');
    this.name = 'EmptyStageListError';
  }
}

export class DuplicateStageNameError extends Error {
  constructor(name: string) {
    super(`A etapa "${name}" aparece mais de uma vez`);
    this.name = 'DuplicateStageNameError';
  }
}

export class ProjectAlreadyAtFinalStageError extends Error {
  constructor(id: number) {
    super(`Projeto ${id} já está na última etapa`);
    this.name = 'ProjectAlreadyAtFinalStageError';
  }
}

export class InvalidProjectNameError extends Error {
  constructor() {
    super('"name" é obrigatório');
    this.name = 'InvalidProjectNameError';
  }
}
