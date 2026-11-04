import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API, getReport, requestReport, waitForEmail, waitUntilFinished } from '../scripts/client.js';

/**
 * Testes de PONTA A PONTA: rodam contra o sistema de verdade, no Docker
 * (`docker compose up -d --build` antes). Passam pelos 3 serviços, pelo
 * Kafka, pelo S3 e pelo Mailpit.
 */
const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemplo.com`;

test('o fluxo inteiro: pedido → fila → worker → S3 → evento → status + e-mail', async () => {
  const email = uniqueEmail('e2e');

  // 1. A API responde NA HORA, sem esperar o relatório.
  const { status, report, ms } = await requestReport({
    email,
    filters: { from: '2026-01-01', to: '2026-01-31', category: 'Livros' },
  });
  assert.equal(status, 202);
  assert.equal(report.status, 'PENDING');
  assert.ok(ms < 500, `o POST deveria ser rápido (levou ${Math.round(ms)} ms)`);

  // 2. Algum tempo depois, o worker termina e a API fica sabendo pelo Kafka.
  const done = await waitUntilFinished(report.id, 30_000);
  assert.equal(done.status, 'COMPLETED');
  assert.ok(done.processedBy, 'deve dizer qual réplica do worker processou');
  assert.ok((done.summary?.salesCount ?? 0) > 0);
  assert.ok((done.processingMs ?? 0) >= 1000, 'o peso simulado (>= 1 s) aparece no tempo de processamento');

  // 3. O download redireciona para uma presigned URL do S3, que entrega o CSV.
  const redirect = await fetch(`${API}${done.links.download}`, { redirect: 'manual' });
  assert.equal(redirect.status, 302);
  const location = redirect.headers.get('location')!;
  assert.match(location, /X-Amz-Signature=/);
  const csv = await (await fetch(location)).text();
  assert.match(csv, /^mes,regiao,categoria/);
  assert.ok(csv.split('\n').every((line) => !line || line.startsWith('mes') || line.startsWith('TOTAL') || line.includes(',Livros,')));

  // 4. O serviço de notificações mandou o e-mail.
  const [mail] = await waitForEmail(email);
  assert.match(mail!.Subject, /está pronto/);
});

test('vários pedidos ao mesmo tempo: todos terminam e cada um recebe o seu e-mail', async () => {
  const emails = Array.from({ length: 6 }, (_, i) => uniqueEmail(`lote${i}`));
  const created = await Promise.all(
    emails.map((email) => requestReport({ email, filters: { from: '2026-02-01', to: '2026-02-07' } })),
  );
  assert.ok(created.every((c) => c.status === 202));

  const finished = await Promise.all(created.map((c) => waitUntilFinished(c.report.id, 60_000)));
  assert.ok(finished.every((r) => r.status === 'COMPLETED'));

  for (const email of emails) {
    assert.equal((await waitForEmail(email)).length, 1, `exatamente 1 e-mail para ${email}`);
  }
});

test('pedido inválido é recusado pela API e nem chega ao Kafka', async () => {
  const { status } = await requestReport({ email: uniqueEmail('inv'), filters: { from: '2026-05-01', to: '2026-04-01' } });
  assert.equal(status, 400);
});

test('consultar relatório inexistente -> 404', async () => {
  const res = await fetch(`${API}/reports/00000000-0000-4000-8000-000000000000`);
  assert.equal(res.status, 404);
  // e o id de um relatório recém-criado já existe imediatamente (antes do worker)
  const { report } = await requestReport({ email: uniqueEmail('x'), filters: { from: '2026-01-01', to: '2026-01-01' } });
  assert.equal((await getReport(report.id)).id, report.id);
});
