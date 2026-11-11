import express from 'express';
import { z } from 'zod';
import type { TaskUseCases } from '../../application/tasks.js';
import { errorHandler } from './errorHandler.js';

export interface AppDeps {
  tasks: TaskUseCases;
  version: string;
  /** Verifica as dependências (banco). Rejeita se algo não estiver pronto. */
  checkReady: () => Promise<void>;
}

const idParam = z.coerce.number().int().positive();
const createBody = z.object({ title: z.string() });
const patchBody = z.object({ done: z.boolean() });

export function createApp({ tasks, version, checkReady }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // LIVENESS: "o processo está vivo?". Não toca no banco: se o banco cair,
  // reiniciar a API não resolve, e queremos evitar um loop de restarts.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version, uptimeSeconds: Math.round(process.uptime()) });
  });

  // READINESS: "posso receber tráfego?". Aqui sim verifica o banco.
  app.get('/api/ready', async (_req, res) => {
    try {
      await checkReady();
      res.json({ status: 'ready', version });
    } catch {
      res.status(503).json({ status: 'not-ready' });
    }
  });

  app.get('/api/version', (_req, res) => {
    res.json({ version });
  });

  app.get('/api/tasks', async (_req, res) => {
    res.json(await tasks.list());
  });

  app.post('/api/tasks', async (req, res) => {
    const { title } = createBody.parse(req.body);
    const task = await tasks.create(title);
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { done } = patchBody.parse(req.body);
    res.json(await tasks.setDone(id, done));
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    await tasks.remove(idParam.parse(req.params.id));
    res.status(204).end();
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });
  app.use(errorHandler);

  return app;
}
