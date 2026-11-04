/**
 * HEXAGONAL: erros de domínio e de aplicação. Nada de status HTTP aqui:
 * quem traduz erro -> status é o `adapters/http/errorHandler.ts`.
 */
export class InvalidPeriodError extends Error {}

export class ReportNotFoundError extends Error {
  constructor(id: string) {
    super(`Relatório "${id}" não encontrado`);
  }
}

export class ReportNotReadyError extends Error {
  constructor(id: string, status: string) {
    super(`O relatório "${id}" ainda não está disponível (status: ${status})`);
  }
}

/** O pedido foi aceito pela API, mas não conseguimos colocá-lo na fila. */
export class QueueUnavailableError extends Error {
  constructor() {
    super('Não foi possível enfileirar o relatório agora. Tente novamente em instantes.');
  }
}
