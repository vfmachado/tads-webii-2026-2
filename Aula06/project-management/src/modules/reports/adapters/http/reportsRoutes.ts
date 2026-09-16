import { Router } from 'express';
import type { ReportsController } from './ReportsController.js';
import type { RequireModuleAccess } from '../../../../shared/http/RequireModuleAccess.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter). Módulo `reports` só
 * tem leitura — exige `READ` no módulo "reports", que é INDEPENDENTE do
 * acesso ao módulo "projects", mesmo que os dados venham de lá por baixo
 * (ver `GetProjectsSummary`). Um usuário pode ter acesso a projetos e não
 * a relatórios, ou vice-versa: a concessão é por módulo de EXPOSIÇÃO, não
 * por dado de origem.
 */
export function createReportsRoutes(
  reportsController: ReportsController,
  requireModuleAccess: RequireModuleAccess,
): Router {
  const router = Router();
  router.get('/summary', requireModuleAccess('reports', 'READ'), (req, res) => reportsController.summary(req, res));
  return router;
}
