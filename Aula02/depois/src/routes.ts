import { Router, type Request, type Response } from 'express';
import type { TaskController } from './controllers/TaskController.js';
import type { TaskSnapshot } from './domain/Task.js';
import { toTaskListViewModel } from './views/taskView.js';

/**
 * Camada fininha de adaptação Express -> Controller: extrai o que interessa
 * de `req` e traduz o `ControllerResult` de volta para `res`. Nenhuma regra
 * de negócio deveria vazar para este arquivo.
 */
export function createTaskRoutes(controller: TaskController): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    // Reaproveita o mesmo `controller.list()` da API JSON — o Controller
    // não sabe (nem precisa saber) que esta chamada vai virar HTML.
    // Quem transforma os dados em algo exibível é a View (`toTaskListViewModel`).
    const result = controller.list();
    res.status(result.status).render('tasks', { tasks: toTaskListViewModel(result.body as TaskSnapshot[]) });
  });

  router.post('/tasks', (req: Request, res: Response) => {
    const result = controller.create(req.body);
    res.status(result.status).json(result.body);
  });

  router.get('/tasks', (_req: Request, res: Response) => {
    const result = controller.list();
    res.status(result.status).json(result.body);
  });

  router.get('/tasks/:id', (req: Request, res: Response) => {
    const result = controller.getById(req.params.id);
    res.status(result.status).json(result.body);
  });

  router.put('/tasks/:id', (req: Request, res: Response) => {
    const result = controller.rename(req.params.id, req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/tasks/:id/complete', (req: Request, res: Response) => {
    const result = controller.complete(req.params.id);
    res.status(result.status).json(result.body);
  });

  router.delete('/tasks/:id', (req: Request, res: Response) => {
    const result = controller.remove(req.params.id);
    if (result.body === null) {
      res.status(result.status).send();
      return;
    }
    res.status(result.status).json(result.body);
  });

  return router;
}
