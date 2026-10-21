import { Router } from 'express';
import type { PlaceOrder } from '../../application/commands/PlaceOrder.js';
import type { ListOrders } from '../../application/queries/ListOrders.js';
import type { ListProducts } from '../../application/queries/ListProducts.js';
import { placeOrderSchema } from './schemas.js';

/**
 * HEXAGONAL: adaptador primário (driving). Fino: valida o formato, chama
 * o caso de uso e devolve o resultado.
 */
export function createRoutes(useCases: {
  listProducts: ListProducts;
  placeOrder: PlaceOrder;
  listOrders: ListOrders;
}): Router {
  const router = Router();

  router.get('/products', async (_req, res) => {
    res.json(await useCases.listProducts.execute());
  });

  router.post('/orders', async (req, res) => {
    const input = placeOrderSchema.parse(req.body);
    res.status(201).json(await useCases.placeOrder.execute(input));
  });

  router.get('/orders', async (_req, res) => {
    res.json(await useCases.listOrders.execute());
  });

  return router;
}
