import type { ProductQueries, ProductSummary } from '../ports/ProductQueries.js';

/**
 * HEXAGONAL + CQRS: QUERY. Não passa pelo domínio: só repassa a pergunta
 * para a porta de leitura.
 */
export class ListProducts {
  constructor(private readonly queries: ProductQueries) {}

  execute(): Promise<ProductSummary[]> {
    return this.queries.list();
  }
}
