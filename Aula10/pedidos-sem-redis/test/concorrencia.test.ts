import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OrderSummary } from '../src/application/ports/OrderQueries.js';
import type { ProductSummary } from '../src/application/ports/ProductQueries.js';
import { fireConcurrentOrders, getJson, startApp } from './helpers.js';

/**
 * ⚠️ NESTA VERSÃO ESTE TESTE FALHA DE PROPÓSITO.
 *
 * Ele descreve o comportamento CORRETO: a camiseta tem 5 unidades, então
 * de 20 pedidos simultâneos só 5 podem ser aceitos. Sem lock, os 20 leem
 * `stock = 5` antes de qualquer um gravar, e todos são aceitos.
 *
 * O mesmo teste, sem mudar uma linha de código, passa em `../pedidos-com-redis`.
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
