import type { ProductRepository } from '../../application/ports/ProductRepository.js';
import type { Product } from '../../domain/Product.js';

/**
 * HEXAGONAL: outro DECORADOR, agora do lado da escrita. Toda vez que um
 * produto é gravado, o estoque mudou e a listagem guardada no cache ficou
 * velha: apagamos a chave para a próxima leitura buscar o dado novo.
 *
 * Sem isto, a vitrine mostraria o estoque antigo até o TTL vencer. O TTL
 * continua lá como rede de segurança, caso alguma invalidação se perca.
 */
export class CacheInvalidatingProductRepository implements ProductRepository {
  constructor(
    private readonly inner: ProductRepository,
    private readonly cache: { invalidate(): Promise<void> },
  ) {}

  findById(id: string): Promise<Product | undefined> {
    return this.inner.findById(id);
  }

  async save(product: Product): Promise<void> {
    await this.inner.save(product);
    await this.cache.invalidate();
  }
}
