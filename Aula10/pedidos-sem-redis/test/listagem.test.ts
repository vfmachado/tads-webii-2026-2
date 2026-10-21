import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getJson, startApp } from './helpers.js';

/**
 * Sem cache, TODA listagem vai ao banco, mesmo que nada tenha mudado entre
 * uma chamada e outra. Compare com o mesmo teste em `../pedidos-com-redis`.
 */
test('20 listagens de produtos = 20 consultas ao banco', async () => {
  const server = await startApp({ latency: { listMs: 50, readMs: 5, writeMs: 5 } });

  try {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      await getJson(`${server.baseUrl}/products`);
    }
    const elapsedMs = Math.round(performance.now() - start);
    const { dbQueries } = await getJson<{ dbQueries: number }>(`${server.baseUrl}/debug/stats`);
    console.table({ listagens: 20, consultasAoBanco: dbQueries, tempoTotalMs: elapsedMs });

    assert.equal(dbQueries, 20);
  } finally {
    await server.close();
  }
});
