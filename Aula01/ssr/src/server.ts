import express, { type Express } from 'express';
import { tasks, renderTasksHtml } from './tasks.js';

/**
 * Fábrica do servidor: recebe a criação do app fora do `listen()`
 * para que os testes possam usar o app sem abrir uma porta de rede real.
 */
export function createServer(): Express {
  const app = express();

  app.get('/', (_req, res) => {
    // SSR: o HTML completo, já com os dados, é montado aqui no servidor
    // e enviado pronto para o navegador.
    const html = `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <title>Aula 01 - SSR</title>
  </head>
  <body>
    <h1>Tarefas (renderizadas no servidor)</h1>
    ${renderTasksHtml(tasks)}
  </body>
</html>`;

    res.status(200).type('html').send(html);
  });

  // Mesmo em um exemplo de SSR, expor os dados também em JSON é útil
  // (para outros clientes, para debug, ou para comparação com o exemplo CSR).
  app.get('/api/tasks', (_req, res) => {
    res.status(200).json(tasks);
  });

  return app;
}
