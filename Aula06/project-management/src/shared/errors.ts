/**
 * HEXAGONAL: erros "de fronteira", compartilhados entre módulos de
 * negócio. Diferente de um erro de domínio (ex.: `ProjectNotFoundError`,
 * que só o módulo `projects` entende), estes representam problemas do
 * próprio mecanismo de entrada/autorização — qualquer adaptador primário
 * (HTTP, ou um futuro adaptador de outro tipo) pode lançá-los. Ficam em
 * `shared/` porque colocá-los dentro de um módulo específico obrigaria os
 * outros módulos a importar erros de domínio uns dos outros, quebrando a
 * fronteira que a Aula 03 já discutiu para `boards`/`cards`.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('Cabeçalho "x-user-id" ausente ou usuário desconhecido');
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
