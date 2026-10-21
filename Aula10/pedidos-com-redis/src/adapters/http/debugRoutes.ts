import { Router } from 'express';
import type { SlowDatabase } from '../memory/SlowDatabase.js';
import type { RedisCachedProductQueries } from '../redis/RedisCachedProductQueries.js';

/**
 * Rotas SÓ PARA A AULA (não existiriam em produção): mostram quantas
 * consultas chegaram ao banco, quantas foram atendidas pelo cache, e
 * permitem voltar ao estoque inicial.
 */
export function createDebugRoutes(db: SlowDatabase, cache: RedisCachedProductQueries): Router {
  const router = Router();

  router.get('/stats', (_req, res) => {
    res.json({ dbQueries: db.queryCount, cacheHits: cache.hits, cacheMisses: cache.misses });
  });

  router.post('/reset', async (_req, res) => {
    db.reset();
    await cache.invalidate();
    cache.hits = 0;
    cache.misses = 0;
    res.status(204).end();
  });

  return router;
}
