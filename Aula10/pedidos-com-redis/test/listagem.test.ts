import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProductSummary } from '../src/application/ports/ProductQueries.js';
import { getJson, startApp } from './helpers.js';

const fastDb = { listMs: 50, readMs: 5, writeMs: 5 };

/**
 * Com o cache, só a PRIMEIRA listagem vai ao banco (MISS); as outras 19
 * saem do Redis (HIT). Compare com o mesmo teste em `../pedidos-sem-redis`,
 * onde são 20 consultas.
 */
test('20 listagens de produtos = 1 consulta ao banco', async () => {
  const server = await startApp({ latency: fastDb });

  try {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      await getJson(`${server.baseUrl}/products`);
    }
    const elapsedMs = Math.round(performance.now() - start);
    const stats = await getJson<{ dbQueries: number; cacheHits: number; cacheMisses: number }>(
      `${server.baseUrl}/debug/stats`,
    );
    console.table({ listagens: 20, consultasAoBanco: stats.dbQueries, cacheHits: stats.cacheHits, tempoTotalMs: elapsedMs });

    assert.equal(stats.dbQueries, 1);
    assert.equal(stats.cacheHits, 19);
  } finally {
    await server.close();
  }
});

/** O cache não pode mostrar estoque velho: gravar um produto invalida a listagem. */
test('depois de um pedido, a listagem mostra o estoque novo', async () => {
  const server = await startApp({ latency: fastDb });

  try {
    const before = await getJson<ProductSummary[]>(`${server.baseUrl}/products`);
    assert.equal(before.find((p) => p.id === 'caneca')?.stock, 50);

    await fetch(`${server.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'caneca', quantity: 3 }),
    });

    const after = await getJson<ProductSummary[]>(`${server.baseUrl}/products`);
    assert.equal(after.find((p) => p.id === 'caneca')?.stock, 47);
  } finally {
    await server.close();
  }
});
