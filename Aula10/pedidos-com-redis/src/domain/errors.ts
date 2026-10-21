/**
 * HEXAGONAL: erros de domínio. Nada de status HTTP aqui: quem decide que
 * `OutOfStockError` vira 409 é o adaptador HTTP (`adapters/http/errorHandler.ts`).
 */
export class InvalidQuantityError extends Error {
  constructor() {
    super('A quantidade deve ser um número inteiro maior que zero');
  }
}

export class OutOfStockError extends Error {
  constructor(productId: string, requested: number, available: number) {
    super(`Estoque insuficiente para "${productId}": pedido ${requested}, disponível ${available}`);
  }
}

export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Produto "${productId}" não encontrado`);
  }
}
