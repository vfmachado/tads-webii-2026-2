import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { postReport, startApi, validRequest } from './helpers.js';

let api: Awaited<ReturnType<typeof startApi>>;
before(async () => {
  api = await startApi();
});
after(() => api.close());

const completion = {
  file: { bucket: 'relatorios', key: 'reports/abc.csv', sizeBytes: 1234 },
  summary: { salesCount: 42, totalCents: 987654 },
  processedBy: 'worker-a',
  durationMs: 3000,
};

test('POST /reports responde 202, aponta o Location e publica o pedido', async () => {
  const before = api.publisher.published.length;
  const res = await postReport(api.baseUrl, validRequest);
  const body = await res.json();

  assert.equal(res.status, 202);
  assert.equal(res.headers.get('location'), `/reports/${body.id}`);
  assert.equal(body.status, 'PENDING');
  assert.equal(api.publisher.published.length, before + 1);
  assert.equal(api.publisher.published.at(-1)?.reportId, body.id);
  assert.deepEqual(api.publisher.published.at(-1)?.filters, validRequest.filters);
});

test('formato inválido (Zod) -> 400 com os campos', async () => {
  const res = await postReport(api.baseUrl, { email: 'nao-e-email', filters: { from: '2026-13-01', to: 'x' } });
  const body = await res.json();
  assert.equal(res.status, 400);
  const fields = body.details.map((d: { field: string }) => d.field).sort();
  assert.deepEqual(fields, ['email', 'filters.from', 'filters.to']);
});

test('região desconhecida -> 400', async () => {
  const res = await postReport(api.baseUrl, { ...validRequest, filters: { ...validRequest.filters, region: 'Marte' } });
  assert.equal(res.status, 400);
});

test('regra de domínio: período maior que um ano -> 400', async () => {
  const res = await postReport(api.baseUrl, { ...validRequest, filters: { from: '2025-01-01', to: '2026-12-31' } });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /366 dias/);
});

test('Kafka fora do ar -> 503 e o relatório fica FAILED', async () => {
  api.publisher.failing = true;
  try {
    const res = await postReport(api.baseUrl, validRequest);
    assert.equal(res.status, 503);
    const [latest] = await (await fetch(`${api.baseUrl}/reports?limit=1`)).json();
    assert.equal(latest.status, 'FAILED');
  } finally {
    api.publisher.failing = false;
  }
});

test('GET /reports/:id de id inexistente -> 404; id mal formado -> 400', async () => {
  assert.equal((await fetch(`${api.baseUrl}/reports/00000000-0000-4000-8000-000000000000`)).status, 404);
  assert.equal((await fetch(`${api.baseUrl}/reports/123`)).status, 400);
});

test('download antes de ficar pronto -> 409', async () => {
  const { id } = await (await postReport(api.baseUrl, validRequest)).json();
  const res = await fetch(`${api.baseUrl}/reports/${id}/download`, { redirect: 'manual' });
  assert.equal(res.status, 409);
});

test('report.completed -> status COMPLETED, link de download e redirect para o storage', async () => {
  const { id } = await (await postReport(api.baseUrl, validRequest)).json();

  assert.equal(await api.markCompleted.execute({ reportId: id, ...completion }), true);
  // a mesma mensagem de novo (at-least-once): ignorada
  assert.equal(await api.markCompleted.execute({ reportId: id, ...completion, processedBy: 'outro' }), false);

  const report = await (await fetch(`${api.baseUrl}/reports/${id}`)).json();
  assert.equal(report.status, 'COMPLETED');
  assert.equal(report.processedBy, 'worker-a');
  assert.deepEqual(report.summary, completion.summary);
  assert.equal(report.links.download, `/reports/${id}/download`);

  const download = await fetch(`${api.baseUrl}${report.links.download}`, { redirect: 'manual' });
  assert.equal(download.status, 302);
  assert.equal(download.headers.get('location'), 'http://storage.test/relatorios/reports/abc.csv?expires=300');
});

test('report.failed -> status FAILED com o motivo', async () => {
  const { id } = await (await postReport(api.baseUrl, validRequest)).json();
  await api.markFailed.execute({ reportId: id, reason: 'banco de vendas fora do ar' });
  const report = await (await fetch(`${api.baseUrl}/reports/${id}`)).json();
  assert.equal(report.status, 'FAILED');
  assert.equal(report.failureReason, 'banco de vendas fora do ar');
});

test('evento de um relatório desconhecido é ignorado', async () => {
  assert.equal(
    await api.markCompleted.execute({ reportId: '00000000-0000-4000-8000-000000000000', ...completion }),
    false,
  );
});
