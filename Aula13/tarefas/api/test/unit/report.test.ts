import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryTaskRepository } from '../../src/adapters/memory/InMemoryTaskRepository.js';
import { createTaskUseCases } from '../../src/application/tasks.js';

describe('relatório (caso de uso)', () => {
  const now = new Date('2026-11-25T12:00:00Z');

  it('sem tarefas: zeros e nenhuma pendente antiga', async () => {
    const tasks = createTaskUseCases(new InMemoryTaskRepository(), { now: () => now });
    const r = await tasks.report();
    assert.deepEqual(
      { total: r.total, done: r.done, pending: r.pending, oldest: r.oldestPendingDays },
      { total: 0, done: 0, pending: 0, oldest: null },
    );
    assert.equal(r.generatedAt, now.toISOString());
  });

  it('a assinatura é determinística e depende do custo (iterações)', async () => {
    const repo = new InMemoryTaskRepository();
    const barato = createTaskUseCases(repo, { reportCpuCost: 1, now: () => now });
    const caro = createTaskUseCases(repo, { reportCpuCost: 2_000, now: () => now });
    assert.equal((await barato.report()).signature, (await barato.report()).signature);
    assert.notEqual((await barato.report()).signature, (await caro.report()).signature);
  });

  it('o custo de CPU cresce com REPORT_CPU_COST', async () => {
    const repo = new InMemoryTaskRepository();
    const time = async (cost: number) => {
      const uc = createTaskUseCases(repo, { reportCpuCost: cost });
      const t0 = performance.now();
      await uc.report();
      return performance.now() - t0;
    };
    await time(1_000); // aquece
    assert.ok((await time(200_000)) > (await time(1_000)), 'mais iterações devem levar mais tempo');
  });
});
