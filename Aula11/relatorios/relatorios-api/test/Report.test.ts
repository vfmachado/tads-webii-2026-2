import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidPeriodError } from '../src/domain/errors.js';
import { Report } from '../src/domain/Report.js';
import { periodInDays } from '../src/domain/ReportFilters.js';

const result = {
  file: { bucket: 'relatorios', key: 'reports/x.csv', sizeBytes: 10 },
  summary: { salesCount: 1, totalCents: 100 },
  processedBy: 'worker-1',
  durationMs: 1000,
};

test('um relatório novo começa PENDING', () => {
  const report = Report.request('ana@exemplo.com', { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(report.status, 'PENDING');
  assert.equal(report.result, undefined);
});

test('o período conta o primeiro e o último dia', () => {
  assert.equal(periodInDays({ from: '2026-01-01', to: '2026-01-01' }), 1);
  assert.equal(periodInDays({ from: '2026-01-01', to: '2026-12-31' }), 365);
});

test('regra: data inicial depois da final é inválida', () => {
  assert.throws(() => Report.request('a@b.com', { from: '2026-02-01', to: '2026-01-01' }), InvalidPeriodError);
});

test('regra: o período não passa de 366 dias', () => {
  assert.throws(() => Report.request('a@b.com', { from: '2025-01-01', to: '2026-06-30' }), InvalidPeriodError);
});

test('idempotência: o segundo "completed" é ignorado', () => {
  const report = Report.request('a@b.com', { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(report.complete(result), true);
  assert.equal(report.complete({ ...result, processedBy: 'worker-2' }), false);
  assert.equal(report.result?.processedBy, 'worker-1');
});

test('um relatório concluído não pode virar FAILED', () => {
  const report = Report.request('a@b.com', { from: '2026-01-01', to: '2026-01-31' });
  report.complete(result);
  assert.equal(report.fail('atrasado'), false);
  assert.equal(report.status, 'COMPLETED');
});
