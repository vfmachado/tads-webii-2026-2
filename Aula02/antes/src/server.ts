import express, { type Express, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Aula 02 — "ANTES": um CRUD de tarefas inteiro dentro dos handlers de rota.
 *
 * Isto NÃO é um exemplo de boas práticas — é o "antes" proposital do
 * comparativo com o projeto `depois/` (MVC). Cada handler mistura:
 *   1) parsing/validação de entrada,
 *   2) regra de negócio (o que é um título válido, quando pode excluir/completar),
 *   3) acesso aos dados (o array `tasks` em memória),
 *   4) formatação da resposta HTTP.
 *
 * Repare que a validação do título aparece DUAS VEZES (POST e PUT) — não
 * porque seja necessário, mas porque não existe nenhum lugar único para
 * colocá-la. Esse é exatamente o tipo de duplicação que a Aula 02 usa como
 * gancho para introduzir o padrão MVC.
 *
 * A rota `GET /` usa EJS para provar que também a "View" sofre sem MVC:
 * como não existe uma camada que prepare os dados para exibição, é o
 * próprio template (`views/tasks.ejs`) quem filtra, conta e formata as
 * tarefas — lógica de apresentação (e um pouco de negócio) vazando para
 * dentro do HTML.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'done';
  createdAt: string;
}

export function createServer(): Express {
  const app = express();
  app.use(express.json());
  app.engine('ejs', ejs.renderFile);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // "Persistência": um array em memória, acessado diretamente pelos handlers.
  const tasks: Task[] = [];

  app.get('/', (_req: Request, res: Response) => {
    // Passa os dados crus para o template — quem decide o que exibir e
    // como formatar é o próprio `.ejs`, não este handler nem uma "View".
    res.render('tasks', { tasks });
  });

  app.post('/tasks', (req: Request, res: Response) => {
    const rawTitle = req.body?.title;

    // Validação do título — versão 1 (dentro do POST).
    if (typeof rawTitle !== 'string') {
      return res.status(400).json({ error: 'title é obrigatório e deve ser texto' });
    }
    const title = rawTitle.trim();
    if (title.length < 3 || title.length > 120) {
      return res.status(400).json({ error: 'title deve ter entre 3 e 120 caracteres' });
    }

    // Regra de negócio: não pode haver duas tarefas pendentes com o mesmo título.
    const duplicate = tasks.some(
      (t) => t.status === 'pending' && t.title.toLowerCase() === title.toLowerCase(),
    );
    if (duplicate) {
      return res.status(409).json({ error: 'já existe uma tarefa pendente com este título' });
    }

    const task: Task = {
      id: randomUUID(),
      title,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);

    return res.status(201).json(task);
  });

  app.get('/tasks', (_req: Request, res: Response) => {
    return res.status(200).json(tasks);
  });

  app.get('/tasks/:id', (req: Request, res: Response) => {
    const task = tasks.find((t) => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'tarefa não encontrada' });
    }
    return res.status(200).json(task);
  });

  app.put('/tasks/:id', (req: Request, res: Response) => {
    const task = tasks.find((t) => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'tarefa não encontrada' });
    }
    if (task.status === 'done') {
      return res.status(409).json({ error: 'não é possível renomear uma tarefa concluída' });
    }

    const rawTitle = req.body?.title;

    // Validação do título — versão 2 (copiada e colada do POST).
    if (typeof rawTitle !== 'string') {
      return res.status(400).json({ error: 'title é obrigatório e deve ser texto' });
    }
    const title = rawTitle.trim();
    if (title.length < 3 || title.length > 120) {
      return res.status(400).json({ error: 'title deve ter entre 3 e 120 caracteres' });
    }

    const duplicate = tasks.some(
      (t) => t.id !== task.id && t.status === 'pending' && t.title.toLowerCase() === title.toLowerCase(),
    );
    if (duplicate) {
      return res.status(409).json({ error: 'já existe uma tarefa pendente com este título' });
    }

    task.title = title;
    return res.status(200).json(task);
  });

  app.post('/tasks/:id/complete', (req: Request, res: Response) => {
    const task = tasks.find((t) => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'tarefa não encontrada' });
    }
    if (task.status === 'done') {
      return res.status(409).json({ error: 'tarefa já está concluída' });
    }
    task.status = 'done';
    return res.status(200).json(task);
  });

  app.delete('/tasks/:id', (req: Request, res: Response) => {
    const index = tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'tarefa não encontrada' });
    }
    if (tasks[index].status === 'done') {
      return res.status(409).json({ error: 'não é possível excluir uma tarefa concluída' });
    }
    tasks.splice(index, 1);
    return res.status(204).send();
  });

  return app;
}
