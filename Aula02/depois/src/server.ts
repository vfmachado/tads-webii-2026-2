import express, { type Express } from 'express';
import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TaskController } from './controllers/TaskController.js';
import { InMemoryTaskRepository, type TaskRepository } from './repositories/TaskRepository.js';
import { createTaskRoutes } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fábrica do servidor. Aceita um `TaskRepository` opcional para que os
 * testes (e um futuro adaptador de banco de dados) possam injetar sua
 * própria implementação sem tocar em `routes.ts` ou `TaskController`.
 */
export function createServer(repository: TaskRepository = new InMemoryTaskRepository()): Express {
  // configuracao do express e do server
  const app = express();
  app.use(express.json());
  app.engine('ejs', ejs.renderFile);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  const controller = new TaskController(repository);
  app.use(createTaskRoutes(controller));

  return app;
}
