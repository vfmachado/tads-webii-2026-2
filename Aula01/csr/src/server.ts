import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tasks } from './tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fábrica do servidor: recebe a criação do app fora do `listen()`
 * para que os testes possam usar o app sem abrir uma porta de rede real.
 */
export function createServer(): Express {
  const app = express();

  // CSR: o servidor só entrega o "casco" HTML (public/index.html) e os dados
  // em JSON. Quem monta a lista de tarefas na tela é o JavaScript do navegador.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/tasks', (_req, res) => {
    res.status(200).json(tasks);
  });

  return app;
}
