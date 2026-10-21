import type { AddressInfo } from 'node:net';
import { createApp, type AppOptions } from '../src/app.js';
import { connectRedis } from '../src/adapters/redis/redisClient.js';

/**
 * Os testes usam o banco 15 do Redis (o padrão da aplicação é o 0), e o
 * apagam antes de cada teste. Suba o Redis antes: `docker compose up -d`.
 *
 * Por isso o `npm test` roda os arquivos um de cada vez
 * (`--test-concurrency=1`): em paralelo, o `flushDb` de um arquivo apagaria
 * o lock que o outro está segurando, e um pedido a mais passaria.
 */
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';

/** Sobe a aplicação numa porta livre e devolve a URL base. */
export async function startApp(
  options: Omit<AppOptions, 'redis'> = {},
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const redis = await connectRedis(TEST_REDIS_URL);
  await redis.flushDb();

  const { app } = createApp({ log: false, ...options, redis });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://localhost:${port}`,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      redis.destroy();
    },
  };
}

/** Dispara `count` pedidos AO MESMO TEMPO e conta as respostas por status. */
export async function fireConcurrentOrders(baseUrl: string, productId: string, count: number) {
  const responses = await Promise.all(
    Array.from({ length: count }, () =>
      fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      }),
    ),
  );
  return {
    created: responses.filter((r) => r.status === 201).length,
    rejected: responses.filter((r) => r.status === 409).length,
  };
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}
