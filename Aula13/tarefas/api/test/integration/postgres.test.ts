import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { Pool } from 'pg';
import { createApp } from '../../src/adapters/http/app.js';
import { PostgresTaskRepository } from '../../src/adapters/postgres/PostgresTaskRepository.js';
import { createTaskUseCases } from '../../src/application/tasks.js';
import { createPool } from '../../src/db.js';
import { runMigrations } from '../../src/migrate.js';

// TESTE DE INTEGRAÇÃO: Postgres de verdade (o do docker-compose.test.yml).
// Sem DATABASE_URL, é pulado. E só roda em banco cujo nome termina em `_test`,
// porque o teste apaga dados: nunca aponte para o banco de desenvolvimento.
const url = process.env.DATABASE_URL;
const skip = !url ? 'defina DATABASE_URL (use: docker compose -f docker-compose.test.yml up)' : false;

describe('integração com PostgreSQL', { skip }, () => {
  let pool: Pool;
  let server: Server;
  let base: string;

  before(async () => {
    assert.match(new URL(url!).pathname, /_test$/, 'o nome do banco de teste deve terminar em _test');
    pool = createPool(url!);
    await pool.query('DROP TABLE IF EXISTS tasks, schema_migrations');
    await runMigrations(pool);

    const tasks = createTaskUseCases(new PostgresTaskRepository(pool));
    server = createApp({ tasks, version: 'it', instance: 'it', checkReady: async () => void (await pool.query('SELECT 1')) }).listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => pool.query('TRUNCATE tasks RESTART IDENTITY'));

  after(async () => {
    server?.close();
    await pool?.end();
  });

  type Res = { json(): Promise<any> } & Response;
  const call = (path: string, init?: RequestInit) =>
    fetch(base + path, { ...init, headers: { 'content-type': 'application/json' } }) as Promise<Res>;

  describe('migrations', () => {
    it('são idempotentes: rodar de novo não aplica nada', async () => {
      assert.deepEqual(await runMigrations(pool), []);
    });

    it('registram checksum e recusam migration alterada depois de aplicada', async () => {
      const dir = (await mkdtemp(join(tmpdir(), 'mig-'))) + '/';
      await writeFile(dir + '001_a.sql', 'SELECT 1;');
      await pool.query('DROP TABLE schema_migrations');
      await runMigrations(pool, dir);
      await writeFile(dir + '001_a.sql', 'SELECT 2;');
      await assert.rejects(runMigrations(pool, dir), /foi alterada/);
      // restaura o estado real para os demais testes
      await pool.query('DROP TABLE tasks, schema_migrations');
      await runMigrations(pool);
    });

    it('uma migration que falha faz rollback completo (tudo ou nada)', async () => {
      const dir = (await mkdtemp(join(tmpdir(), 'mig-'))) + '/';
      await writeFile(dir + '001_ok.sql', 'CREATE TABLE tmp_a (id int); SELECT sintaxe_invalida;');
      await assert.rejects(runMigrations(pool, dir), /Falha na migration/);
      const { rows } = await pool.query("SELECT to_regclass('tmp_a') AS t");
      assert.equal(rows[0].t, null);
    });
  });

  describe('repositório + API', () => {
    it('fluxo principal persiste no banco', async () => {
      const created = await call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'publicar' }) });
      assert.equal(created.status, 201);
      const task = await created.json();
      assert.equal(task.done, false);
      assert.equal(task.doneAt, null);

      const patched = await (await call(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: true }) })).json();
      assert.equal(patched.done, true);
      assert.ok(patched.doneAt);

      const reopened = await (await call(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: false }) })).json();
      assert.equal(reopened.doneAt, null);

      const { rows } = await pool.query('SELECT count(*)::int AS n FROM tasks');
      assert.equal(rows[0].n, 1);
    });

    it('lista da mais nova para a mais antiga', async () => {
      for (const title of ['primeira', 'segunda', 'terceira']) {
        await call('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) });
      }
      const titles = (await (await call('/api/tasks')).json()).map((t: { title: string }) => t.title);
      assert.deepEqual(titles, ['terceira', 'segunda', 'primeira']);
    });

    it('a constraint do banco é a última linha de defesa', async () => {
      await assert.rejects(pool.query("INSERT INTO tasks (title) VALUES ('')"), /check/i);
    });

    it('tarefa inexistente → 404', async () => {
      assert.equal((await call('/api/tasks/12345', { method: 'PATCH', body: JSON.stringify({ done: true }) })).status, 404);
    });

    it('ready responde 200 com o banco no ar', async () => {
      assert.equal((await call('/api/ready')).status, 200);
    });
  });
});
