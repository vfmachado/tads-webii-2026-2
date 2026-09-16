import { Router } from 'express';
import type { ProjectController } from './ProjectController.js';
import type { RequireModuleAccess } from '../../../../shared/http/RequireModuleAccess.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter). Cada rota declara,
 * individualmente, qual permissão exige no módulo "projects" — leitura
 * (`READ`) para consultas, escrita (`WRITE`) para criar e avançar etapa.
 * `requireModuleAccess` chega pronto de fora (injetado pela composition
 * root); este arquivo não sabe, e não precisa saber, como a checagem é
 * feita por baixo — só que existe um módulo chamado "projects".
 */
export function createProjectRoutes(
  projectController: ProjectController,
  requireModuleAccess: RequireModuleAccess,
): Router {
  const router = Router();

  router.post('/', requireModuleAccess('projects', 'WRITE'), (req, res) => projectController.create(req, res));
  router.get('/', requireModuleAccess('projects', 'READ'), (req, res) => projectController.list(req, res));
  router.get('/:id', requireModuleAccess('projects', 'READ'), (req, res) => projectController.get(req, res));
  router.post('/:id/advance', requireModuleAccess('projects', 'WRITE'), (req, res) =>
    projectController.advance(req, res),
  );

  return router;
}
