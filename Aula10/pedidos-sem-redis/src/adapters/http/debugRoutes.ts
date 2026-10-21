import { Router } from 'express';
import type { SlowDatabase } from '../memory/SlowDatabase.js';

/**
 * Rotas SÓ PARA A AULA (não existiriam em produção): mostram quantas
 * consultas chegaram ao banco e permitem voltar ao estoque inicial.
 */
export function createDebugRoutes(db: SlowDatabase): Router {
  const router = Router();

  router.get('/stats', (_req, res) => {
    res.json({ dbQueries: db.queryCount });
  });

  router.post('/reset', (_req, res) => {
    db.reset();
    res.status(204).end();
  });

  return router;
}
