import express, { type Express } from 'express';
import { z } from 'zod';
import { PlaceOrder } from './application/commands/PlaceOrder.js';
import { ListOrders } from './application/queries/ListOrders.js';
import { ListProducts } from './application/queries/ListProducts.js';
import { InMemoryOrderQueries } from './adapters/memory/InMemoryOrderQueries.js';
import { InMemoryOrderRepository } from './adapters/memory/InMemoryOrderRepository.js';
import { InMemoryProductQueries } from './adapters/memory/InMemoryProductQueries.js';
import { InMemoryProductRepository } from './adapters/memory/InMemoryProductRepository.js';
import { DEFAULT_LATENCY, SlowDatabase, type DatabaseLatency } from './adapters/memory/SlowDatabase.js';
import { FakePaymentGateway } from './adapters/payment/FakePaymentGateway.js';
import { CacheInvalidatingProductRepository } from './adapters/redis/CacheInvalidatingProductRepository.js';
import { RedisCachedProductQueries } from './adapters/redis/RedisCachedProductQueries.js';
import { RedisLock } from './adapters/redis/RedisLock.js';
import type { RedisClient } from './adapters/redis/redisClient.js';
import { createDebugRoutes } from './adapters/http/debugRoutes.js';
import { createRoutes } from './adapters/http/routes.js';
import { errorHandler } from './adapters/http/errorHandler.js';

z.config(z.locales.pt());

export interface AppOptions {
  redis: RedisClient;
  latency?: DatabaseLatency;
  paymentDelayMs?: number;
  cacheTtlSeconds?: number;
  log?: boolean;
}

/**
 * HEXAGONAL: COMPOSITION ROOT. Compare com `../pedidos-sem-redis/src/app.ts`:
 * o Redis entra SÓ aqui, embrulhando adaptadores que já existiam.
 *
 *   - Leitura: `InMemoryProductQueries` ganha por fora um
 *     `RedisCachedProductQueries` (cache-aside).
 *   - Escrita: `InMemoryProductRepository` ganha por fora um
 *     `CacheInvalidatingProductRepository` (apaga o cache ao gravar).
 *   - O command `PlaceOrder` recebe um `RedisLock`.
 *
 * Domínio, queries, portas antigas e rotas HTTP continuam iguais.
 */
export function createApp({
  redis,
  latency = DEFAULT_LATENCY,
  paymentDelayMs = 100,
  cacheTtlSeconds = 60,
  log = true,
}: AppOptions): { app: Express; db: SlowDatabase } {
  // --- adaptadores secundários ---
  const db = new SlowDatabase(latency, log);
  const payments = new FakePaymentGateway(paymentDelayMs, log);
  const productQueries = new RedisCachedProductQueries(new InMemoryProductQueries(db), redis, cacheTtlSeconds, log);
  const productRepository = new CacheInvalidatingProductRepository(new InMemoryProductRepository(db), productQueries);
  const lock = new RedisLock(redis, undefined, log);

  // --- casos de uso ---
  const placeOrder = new PlaceOrder(productRepository, new InMemoryOrderRepository(db), payments, lock);
  const listProducts = new ListProducts(productQueries);
  const listOrders = new ListOrders(new InMemoryOrderQueries(db));

  // --- adaptador primário HTTP ---
  const app = express();
  app.use(express.json());
  app.use(createRoutes({ listProducts, placeOrder, listOrders }));
  app.use('/debug', createDebugRoutes(db, productQueries));
  app.use(errorHandler);

  return { app, db };
}
