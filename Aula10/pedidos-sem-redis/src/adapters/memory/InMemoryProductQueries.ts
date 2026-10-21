import type { ProductQueries, ProductSummary } from '../../application/ports/ProductQueries.js';
import type { SlowDatabase } from './SlowDatabase.js';

/**
 * HEXAGONAL + CQRS: adaptador da LEITURA. Toda chamada é um
 * `SELECT * FROM products` de 300 ms — mesmo que nada tenha mudado
 * desde a última vez.
 */
export class InMemoryProductQueries implements ProductQueries {
  constructor(private readonly db: SlowDatabase) {}

  async list(): Promise<ProductSummary[]> {
    const rows = await this.db.selectAllProducts();
    return rows.map(({ id, name, priceCents, stock }) => ({ id, name, priceCents, stock }));
  }
}
