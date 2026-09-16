import { Router } from 'express';
import type { AccessController } from './AccessController.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter) — só declara URLs e
 * verbos HTTP, delegando tudo para o `AccessController`. Note que estas
 * rotas exigem `currentUser` (identidade), mas NÃO passam por
 * `requireModuleAccess`: conceder/revogar acesso é controlado por role
 * (`ADMIN`, checado dentro do caso de uso), não por um grant de módulo —
 * senão nenhum admin conseguiria conceder o primeiro acesso a ninguém.
 */
export function createAccessRoutes(accessController: AccessController): Router {
  const router = Router();

  router.post('/grants', (req, res) => accessController.grant(req, res));
  router.delete('/grants', (req, res) => accessController.revoke(req, res));
  router.get('/grants/:userId', (req, res) => accessController.listGrantsOf(req, res));

  return router;
}
