import type { ProductQueries, ProductSummary } from '../../application/ports/ProductQueries.js';
import type { RedisClient } from './redisClient.js';

/**
 * HEXAGONAL: adaptador secundário que DECORA outro adaptador. Implementa a
 * mesma porta `ProductQueries` e envolve o adaptador do banco:
 *
 *   ListProducts ──► RedisCachedProductQueries ──(só no MISS)──► InMemoryProductQueries ──► banco
 *                          │
 *                          └── GET/SET cache:products no Redis
 *
 * Estratégia CACHE-ASIDE:
 *   1. procura a resposta no Redis;
 *   2. achou (HIT)? devolve, sem tocar no banco;
 *   3. não achou (MISS)? consulta o banco, guarda no Redis com validade
 *      (TTL) e devolve.
 *
 * Nem o caso de uso `ListProducts` nem a porta mudaram: o cache foi ligado
 * só no composition root (`app.ts`).
 */
export class RedisCachedProductQueries implements ProductQueries {
  static readonly KEY = 'cache:products';

  hits = 0;
  misses = 0;

  constructor(
    private readonly inner: ProductQueries,
    private readonly redis: RedisClient,
    private readonly ttlSeconds = 60,
    private readonly log = true,
  ) {}

  async list(): Promise<ProductSummary[]> {
    const cached = await this.redis.get(RedisCachedProductQueries.KEY);
    if (cached) {
      this.hits++;
      if (this.log) {
        console.log(`[cache] HIT  ${RedisCachedProductQueries.KEY}`);
      }
      return JSON.parse(cached) as ProductSummary[];
    }

    this.misses++;
    if (this.log) {
      console.log(`[cache] MISS ${RedisCachedProductQueries.KEY} -> indo ao banco`);
    }
    const fresh = await this.inner.list();
    await this.redis.set(RedisCachedProductQueries.KEY, JSON.stringify(fresh), {
      expiration: { type: 'EX', value: this.ttlSeconds },
    });
    return fresh;
  }

  /** Apaga a resposta guardada: a próxima listagem vai ao banco. */
  async invalidate(): Promise<void> {
    await this.redis.del(RedisCachedProductQueries.KEY);
    if (this.log) {
      console.log(`[cache] DEL  ${RedisCachedProductQueries.KEY}`);
    }
  }
}
