import type { ProductRepository } from '../../application/ports/ProductRepository.js';
import { Product } from '../../domain/Product.js';
import type { SlowDatabase } from './SlowDatabase.js';

/** HEXAGONAL + CQRS: adaptador da ESCRITA. Converte linha <-> entidade. */
export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly db: SlowDatabase) {}

  async findById(id: string): Promise<Product | undefined> {
    const row = await this.db.selectProduct(id);
    return row ? new Product(row.id, row.name, row.priceCents, row.stock) : undefined;
  }

  async save(product: Product): Promise<void> {
    await this.db.updateProduct({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      stock: product.stock,
    });
  }
}
