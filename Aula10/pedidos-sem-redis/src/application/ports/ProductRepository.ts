import type { Product } from '../../domain/Product.js';

/**
 * HEXAGONAL + CQRS: porta de saída do lado da ESCRITA. Carrega UM produto
 * (a entidade, com as regras) e salva o novo estado.
 */
export interface ProductRepository {
  findById(id: string): Promise<Product | undefined>;
  save(product: Product): Promise<void>;
}
