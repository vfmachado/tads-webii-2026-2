/**
 * HEXAGONAL: erros de domínio. São classes comuns de JavaScript — nada de
 * status HTTP aqui. Quem decide que `EmailAlreadyRegisteredError` vira
 * 409 é o adaptador HTTP (`adapters/http/errorHandler.ts`).
 */
export class InvalidUserDataError extends Error {}

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`O e-mail "${email}" já está cadastrado`);
  }
}

export class UserNotFoundError extends Error {
  constructor(email: string) {
    super(`Usuário "${email}" não encontrado`);
  }
}

export class InvalidVerificationCodeError extends Error {
  constructor() {
    super('Código de verificação inválido');
  }
}

export class UserAlreadyVerifiedError extends Error {
  constructor() {
    super('Usuário já verificado');
  }
}
