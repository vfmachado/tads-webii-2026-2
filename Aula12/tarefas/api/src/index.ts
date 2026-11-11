import { createApp } from './adapters/http/app.js';
import { PostgresTaskRepository } from './adapters/postgres/PostgresTaskRepository.js';
import { createTaskUseCases } from './application/tasks.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

/** COMPOSITION ROOT: o único lugar que lê process.env e liga as peças. */
const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL);

const app = createApp({
  tasks: createTaskUseCases(new PostgresTaskRepository(pool)),
  version: config.APP_VERSION,
  checkReady: async () => {
    await pool.query('SELECT 1');
  },
});

const server = app.listen(config.PORT, () => {
  console.log(`[api] versão ${config.APP_VERSION} em http://0.0.0.0:${config.PORT} (${config.NODE_ENV})`);
});

// Desligamento limpo: o `docker stop` manda SIGTERM. Paramos de aceitar
// conexões, esperamos as requisições em andamento e fechamos o pool.
// Sem isso, um deploy derruba requisições no meio.
let closing = false;
function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`[api] ${signal} recebido, encerrando...`);
  setTimeout(() => process.exit(1), 8_000).unref();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
