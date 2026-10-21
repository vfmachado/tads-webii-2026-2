import { createApp } from './app.js';
import { connectRedis } from './adapters/redis/redisClient.js';
import { RedisCachedProductQueries } from './adapters/redis/RedisCachedProductQueries.js';

const port = Number(process.env.PORT ?? 3010);
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const redis = await connectRedis(redisUrl);
// O banco em memória começa do zero a cada execução; o Redis, não.
// Apagamos a listagem guardada para ela não mostrar o estoque da execução anterior.
await redis.del(RedisCachedProductQueries.KEY);

const { app } = createApp({ redis });

app.listen(port, () => {
  console.log(`Pedidos (COM Redis em ${redisUrl}) rodando em http://localhost:${port}`);
});
