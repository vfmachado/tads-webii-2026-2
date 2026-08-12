import express, { type Express } from 'express';
import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardController } from './boards/BoardController.js';
import { CardController } from './cards/CardController.js';
import { createRoutes } from './routes.js';
import { errorHandler } from './shared/errorHandler.js';
import { createSeededRepositories, type SeededRepositories } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fábrica do servidor. Aceita repositórios opcionais para que os testes
 * (integração/e2e) possam controlar exatamente que dados existem, em vez
 * de depender do quadro semeado em `seed.ts`. Quando nenhum é informado,
 * usa o quadro hard-coded — é o que acontece em `npm run dev` e no teste
 * e2e (`test/e2e/board.e2e.test.ts`), que verifica justamente esse estado
 * inicial.
 */
export function createServer(repositories: SeededRepositories = createSeededRepositories()): Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.engine('ejs', ejs.renderFile);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  const boardController = new BoardController(repositories.boardRepository, repositories.cardRepository);
  const cardController = new CardController(repositories.cardRepository, repositories.boardRepository);
  app.use(createRoutes(boardController, cardController));

  app.use(errorHandler);

  return app;
}
