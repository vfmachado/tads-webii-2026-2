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
import { createDebugRoutes } from './adapters/http/debugRoutes.js';
import { createRoutes } from './adapters/http/routes.js';
import { errorHandler } from './adapters/http/errorHandler.js';

z.config(z.locales.pt());

export interface AppOptions {
  latency?: DatabaseLatency;
  paymentDelayMs?: number;
  log?: boolean;
}

/**
 * HEXAGONAL: COMPOSITION ROOT. Conecta adaptadores -> portas -> casos de
 * uso -> HTTP. Fica separado do `index.ts` para os testes conseguirem
 * subir a mesma aplicação sem abrir uma porta fixa.
 */
export function createApp({ latency = DEFAULT_LATENCY, paymentDelayMs = 100, log = true }: AppOptions = {}): {
  app: Express;
  db: SlowDatabase;
} {
  // --- adaptadores secundários ---
  const db = new SlowDatabase(latency, log);
  const payments = new FakePaymentGateway(paymentDelayMs, log);

  // --- casos de uso ---
  const placeOrder = new PlaceOrder(new InMemoryProductRepository(db), new InMemoryOrderRepository(db), payments);
  const listProducts = new ListProducts(new InMemoryProductQueries(db));
  const listOrders = new ListOrders(new InMemoryOrderQueries(db));

  // --- adaptador primário HTTP ---
  const app = express();
  app.use(express.json());
  app.use(createRoutes({ listProducts, placeOrder, listOrders }));
  app.use('/debug', createDebugRoutes(db));
  app.use(errorHandler);

  return { app, db };
}
