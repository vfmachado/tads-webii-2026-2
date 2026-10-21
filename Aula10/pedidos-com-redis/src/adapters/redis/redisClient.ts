import { createClient } from 'redis';

function createRedisClient(url: string) {
  return createClient({ url });
}

export type RedisClient = ReturnType<typeof createRedisClient>;

/** Cria e conecta o cliente. A URL vem do composition root. */
export async function connectRedis(url: string): Promise<RedisClient> {
  const client = createRedisClient(url);
  client.on('error', (err) => console.error('[redis] erro de conexão:', err.message));
  await client.connect();
  return client;
}
