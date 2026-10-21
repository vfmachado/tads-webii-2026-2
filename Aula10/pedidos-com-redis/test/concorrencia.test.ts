import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OrderSummary } from '../src/application/ports/OrderQueries.js';
import type { ProductSummary } from '../src/application/ports/ProductQueries.js';
import { fireConcurrentOrders, getJson, startApp } from './helpers.js';

/**
 * O MESMO teste de `../pedidos-sem-redis`, sem mudar uma linha de código.
 * Lá ele falha (20 pedidos aceitos, estoque final 4); aqui ele passa,
 * porque o `RedisLock` deixa só um pedido da camiseta por vez entre
 * "ler o estoque" e "gravar o estoque".
 */
test('20 pedidos simultâneos de um produto com 5 unidades: só 5 são vendidos', async () => {
  const server = await startApp();

  try {
    const { created, rejected } = await fireConcurrentOrders(server.baseUrl, 'camiseta', 20);
    const products = await getJson<ProductSummary[]>(`${server.baseUrl}/products`);
    const orders = await getJson<OrderSummary[]>(`${server.baseUrl}/orders`);

    const result = {
      pedidosAceitos: created,
      pedidosRecusados: rejected,
      pedidosGravadosNoBanco: orders.filter((o) => o.productId === 'camiseta').length,
      estoqueFinal: products.find((p) => p.id === 'camiseta')?.stock,
    };
    console.table(result);

    assert.deepEqual(result, {
      pedidosAceitos: 5,
      pedidosRecusados: 15,
      pedidosGravadosNoBanco: 5,
      estoqueFinal: 0,
    });
  } finally {
    await server.close();
  }
});
