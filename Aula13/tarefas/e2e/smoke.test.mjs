// SMOKE TEST / E2E pós-deploy. Zero dependências: só Node 22+.
//
// Pergunta: "depois de publicar, o fluxo principal funciona de verdade?"
// Passa por TODA a cadeia, como o usuário: nginx → API → PostgreSQL.
//
//   BASE_URL=http://localhost:8013 node --test e2e/smoke.test.mjs
//   (no Kubernetes, o scripts/deploy.sh roda este arquivo na rede do k3d)
//   EXPECTED_VERSION=abc123  (opcional) confere se subiu a versão certa
//
// Deixa o banco como encontrou: remove a tarefa que criou.
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

const BASE = (process.env.BASE_URL ?? 'http://localhost:8013').replace(/\/$/, '');
const EXPECTED_VERSION = process.env.EXPECTED_VERSION;

const call = (path, init) =>
  fetch(BASE + path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });

const created = [];

after(async () => {
  for (const id of created) await call(`/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {});
});

describe(`smoke em ${BASE}`, () => {
  it('o frontend estático é servido e referencia assets que existem', async () => {
    const res = await fetch(BASE + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    assert.match(res.headers.get('cache-control') ?? '', /no-cache/, 'index.html não pode ficar em cache');
    const html = await res.text();
    assert.match(html, /<div id="root">/);

    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(assets.length >= 2, 'esperava ao menos um .js e um .css');
    for (const asset of assets) {
      const a = await fetch(BASE + asset);
      assert.equal(a.status, 200, `${asset} deveria existir`);
      assert.match(a.headers.get('cache-control') ?? '', /immutable/);
    }
  });

  it('uma rota desconhecida do front cai no index.html (SPA)', async () => {
    const res = await fetch(BASE + '/qualquer/rota');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<div id="root">/);
  });

  it('a API está pronta (inclui o banco) e informa a versão', async () => {
    const res = await call('/api/ready');
    assert.equal(res.status, 200);
    const { version } = await res.json();
    if (EXPECTED_VERSION) assert.equal(version, EXPECTED_VERSION, 'subiu a versão errada?');
  });

  it('fluxo principal: criar → listar → concluir → remover, passando pelo banco', async () => {
    const title = `smoke ${Date.now()}`;

    const create = await call('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) });
    assert.equal(create.status, 201);
    const task = await create.json();
    created.push(task.id);

    const list = await (await call('/api/tasks')).json();
    assert.ok(list.some((t) => t.id === task.id && t.title === title), 'a tarefa criada deve aparecer na lista');

    const patch = await call(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: true }) });
    assert.equal(patch.status, 200);
    const done = await patch.json();
    assert.equal(done.done, true);
    assert.ok(done.doneAt, 'migration 002 aplicada: doneAt preenchido');

    assert.equal((await call(`/api/tasks/${task.id}`, { method: 'DELETE' })).status, 204);
    created.length = 0;
    const after = await (await call('/api/tasks')).json();
    assert.ok(!after.some((t) => t.id === task.id));
  });

  it('o relatório (rota que gasta CPU) responde e diz qual réplica atendeu', async () => {
    const res = await call('/api/tasks/report');
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('x-instance'), 'toda resposta da API deve trazer o X-Instance');
    const report = await res.json();
    assert.equal(typeof report.total, 'number');
    assert.match(report.signature, /^[0-9a-f]{64}$/);
  });

  it('erros da API chegam ao cliente sem vazar detalhes internos', async () => {
    const res = await call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: '' }) });
    assert.equal(res.status, 400);
    const text = await res.text();
    assert.ok(!/at .*\(.*:\d+:\d+\)/.test(text), 'não deve haver stack trace na resposta');
  });
});
