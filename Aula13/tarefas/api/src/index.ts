import { hostname } from 'node:os';
import { createApp } from './adapters/http/app.js';
import { PostgresTaskRepository } from './adapters/postgres/PostgresTaskRepository.js';
import { createTaskUseCases } from './application/tasks.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

/** COMPOSITION ROOT: o único lugar que lê process.env e liga as peças. */
const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL, config.DB_POOL_MAX);
// No Kubernetes, o hostname do contêiner é o nome do pod (api-7d9f...-x2k4q).
const instance = hostname();

const app = createApp({
  tasks: createTaskUseCases(new PostgresTaskRepository(pool), { reportCpuCost: config.REPORT_CPU_COST }),
  version: config.APP_VERSION,
  instance,
  checkReady: async () => {
    await pool.query('SELECT 1');
  },
});

const server = app.listen(config.PORT, () => {
  console.log(`[api] versão ${config.APP_VERSION} (${instance}) em http://0.0.0.0:${config.PORT} (${config.NODE_ENV})`);
});

// Desligamento limpo: o `docker stop` e o Kubernetes (num deploy ou quando o
// HPA REDUZ o número de réplicas) mandam SIGTERM. Paramos de aceitar
// conexões, esperamos as requisições em andamento e fechamos o pool.
// Sem isso, cada scale-down derruba requisições no meio.
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
