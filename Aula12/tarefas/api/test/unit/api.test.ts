import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../../src/adapters/http/app.js';
import { InMemoryTaskRepository } from '../../src/adapters/memory/InMemoryTaskRepository.js';
import { createTaskUseCases } from '../../src/application/tasks.js';

// TESTE DE API com adaptador em memória: exercita rotas, validação e
// tratamento de erros sem precisar de banco.
let server: Server;
let base: string;
let ready = true;

before(async () => {
  const app = createApp({
    tasks: createTaskUseCases(new InMemoryTaskRepository()),
    version: 'teste-1',
    checkReady: async () => {
      if (!ready) throw new Error('banco fora');
    },
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

type Res = { json(): Promise<any> } & Response;
const call = (path: string, init?: RequestInit) =>
  fetch(base + path, { ...init, headers: { 'content-type': 'application/json' } }) as Promise<Res>;

describe('API (memória)', () => {
  it('health informa a versão', async () => {
    const res = await call('/api/health');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).version, 'teste-1');
  });

  it('ready devolve 503 quando o banco não responde, e volta a 200 depois', async () => {
    ready = false;
    assert.equal((await call('/api/ready')).status, 503);
    ready = true;
    assert.equal((await call('/api/ready')).status, 200);
  });

  it('fluxo principal: criar, listar, concluir, remover', async () => {
    const created = await call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: '  estudar docker ' }) });
    assert.equal(created.status, 201);
    const task = await created.json();
    assert.equal(task.title, 'estudar docker');
    assert.equal(created.headers.get('location'), `/api/tasks/${task.id}`);

    const list = await (await call('/api/tasks')).json();
    assert.equal(list.length, 1);

    const patched = await call(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: true }) });
    const done = await patched.json();
    assert.equal(done.done, true);
    assert.ok(done.doneAt);

    assert.equal((await call(`/api/tasks/${task.id}`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await (await call('/api/tasks')).json(), []);
  });

  it('título inválido → 400', async () => {
    const res = await call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: '   ' }) });
    assert.equal(res.status, 400);
  });

  it('corpo sem o campo → 400; JSON quebrado → 400', async () => {
    assert.equal((await call('/api/tasks', { method: 'POST', body: '{}' })).status, 400);
    assert.equal((await call('/api/tasks', { method: 'POST', body: '{quebrado' })).status, 400);
  });

  it('tarefa inexistente → 404; id inválido → 400', async () => {
    assert.equal((await call('/api/tasks/999', { method: 'DELETE' })).status, 404);
    assert.equal((await call('/api/tasks/abc', { method: 'DELETE' })).status, 400);
  });

  it('rota desconhecida → 404 em JSON', async () => {
    const res = await call('/api/nada');
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Rota não encontrada' });
  });
});
