import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenerateReport } from '../src/application/commands/GenerateReport.js';
import type { ReportCompleted, ReportEventPublisher, ReportFailed } from '../src/application/ports/ReportEventPublisher.js';
import type { ReportStorage, StoredFile } from '../src/application/ports/ReportStorage.js';
import type { ProgressCallback, SalesRepository } from '../src/application/ports/SalesRepository.js';
import { MockSalesDatabase } from '../src/adapters/mock/MockSalesDatabase.js';
import type { ReportFilters } from '../src/domain/ReportFilters.js';
import type { Sale } from '../src/domain/SalesReport.js';

class FakeSales implements SalesRepository {
  calls = 0;
  constructor(private readonly failuresBeforeSuccess = 0) {}
  async findSales(_filters: ReportFilters, onProgress: ProgressCallback): Promise<Sale[]> {
    this.calls++;
    await onProgress(50);
    if (this.calls <= this.failuresBeforeSuccess) throw new Error('banco instável');
    await onProgress(100);
    return [{ id: 1, date: '2026-01-10', region: 'Sul', category: 'Livros', seller: 'Ana', amountCents: 2500 }];
  }
}

class FakeStorage implements ReportStorage {
  readonly files = new Map<string, string>();
  async upload(key: string, content: string): Promise<StoredFile> {
    this.files.set(key, content);
    return { bucket: 'relatorios', key, sizeBytes: content.length };
  }
}

class FakeEvents implements ReportEventPublisher {
  readonly completedEvents: ReportCompleted[] = [];
  readonly failedEvents: ReportFailed[] = [];
  failPublishing = false;
  async completed(event: ReportCompleted) {
    if (this.failPublishing) throw new Error('Kafka fora do ar');
    this.completedEvents.push(event);
  }
  async failed(event: ReportFailed) {
    this.failedEvents.push(event);
  }
}

const input = {
  reportId: '11111111-1111-4111-8111-111111111111',
  email: 'ana@exemplo.com',
  filters: { from: '2026-01-01', to: '2026-01-31' },
};

function setup(failuresBeforeSuccess = 0) {
  const sales = new FakeSales(failuresBeforeSuccess);
  const storage = new FakeStorage();
  const events = new FakeEvents();
  const useCase = new GenerateReport(sales, storage, events, { workerId: 'w1', retryDelayMs: 1, log: false });
  return { sales, storage, events, useCase };
}

test('gera o CSV, grava no storage com a chave do relatório e publica completed', async () => {
  const { storage, events, useCase } = setup();
  const progress: number[] = [];

  assert.equal(await useCase.execute(input, async (p) => void progress.push(p)), 'completed');

  assert.match(storage.files.get(`reports/${input.reportId}.csv`)!, /^mes,regiao/);
  assert.equal(events.completedEvents.length, 1);
  const [event] = events.completedEvents;
  assert.equal(event!.processedBy, 'w1');
  assert.deepEqual(event!.summary, { salesCount: 1, totalCents: 2500 });
  assert.deepEqual(progress, [50, 100], 'o progresso chega ao adaptador (que manda heartbeat)');
});

test('falha temporária: tenta de novo e conclui', async () => {
  const { sales, events, useCase } = setup(2);
  assert.equal(await useCase.execute(input), 'completed');
  assert.equal(sales.calls, 3);
  assert.equal(events.completedEvents.length, 1);
  assert.equal(events.failedEvents.length, 0);
});

test('esgotou as tentativas: publica failed com o motivo', async () => {
  const { sales, events, useCase } = setup(99);
  assert.equal(await useCase.execute(input), 'failed');
  assert.equal(sales.calls, 3);
  assert.deepEqual(events.failedEvents, [
    { reportId: input.reportId, email: input.email, reason: 'banco instável', attempts: 3, processedBy: 'w1' },
  ]);
});

test('falha ao PUBLICAR sobe o erro (o Kafka vai reentregar a mensagem)', async () => {
  const { sales, events, useCase } = setup();
  events.failPublishing = true;
  await assert.rejects(useCase.execute(input), /Kafka fora do ar/);
  assert.equal(sales.calls, 1, 'não refaz a consulta: quem repete é o Kafka');
});

test('reprocessar a mesma mensagem é seguro: sobrescreve o mesmo arquivo', async () => {
  const { storage, useCase } = setup();
  await useCase.execute(input);
  await useCase.execute(input);
  assert.equal(storage.files.size, 1);
});

test('MockSalesDatabase: o peso cresce com o período', async () => {
  const db = new MockSalesDatabase({ baseMs: 0, msPerDay: 2, failureRate: 0, log: false });
  const time = async (filters: ReportFilters) => {
    const start = performance.now();
    const sales = await db.findSales(filters, async () => {});
    return { ms: performance.now() - start, count: sales.length };
  };
  const week = await time({ from: '2026-01-01', to: '2026-01-07' });
  const quarter = await time({ from: '2026-01-01', to: '2026-03-31' });
  assert.ok(quarter.ms > week.ms * 5, `3 meses (${quarter.ms} ms) deveria pesar bem mais que 1 semana (${week.ms} ms)`);
  assert.ok(quarter.count > week.count * 10);
});

test('MockSalesDatabase: com failureRate = 1 a consulta falha', async () => {
  const db = new MockSalesDatabase({ baseMs: 0, msPerDay: 0, failureRate: 1, log: false });
  await assert.rejects(db.findSales({ from: '2026-01-01', to: '2026-01-01' }, async () => {}), /simulado/);
});
