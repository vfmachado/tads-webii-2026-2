import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('aplica os padrões', () => {
    const c = loadConfig({ DATABASE_URL: 'postgres://x' });
    assert.equal(c.PORT, 3000);
    assert.equal(c.NODE_ENV, 'development');
    assert.equal(c.APP_VERSION, 'dev');
    assert.equal(c.DB_POOL_MAX, 10);
    assert.equal(c.REPORT_CPU_COST, 200_000);
  });

  it('lê o tamanho do pool e o custo do relatório (vêm do Terraform)', () => {
    const c = loadConfig({ DATABASE_URL: 'x', DB_POOL_MAX: '5', REPORT_CPU_COST: '1000' });
    assert.equal(c.DB_POOL_MAX, 5);
    assert.equal(c.REPORT_CPU_COST, 1000);
  });

  it('rejeita pool maior que o limite de conexões do Postgres', () => {
    assert.throws(() => loadConfig({ DATABASE_URL: 'x', DB_POOL_MAX: '500' }), /DB_POOL_MAX/);
  });

  it('converte PORT para número', () => {
    assert.equal(loadConfig({ DATABASE_URL: 'postgres://x', PORT: '8123' }).PORT, 8123);
  });

  it('falha na partida, com mensagem clara, se faltar DATABASE_URL', () => {
    assert.throws(() => loadConfig({}), /DATABASE_URL/);
  });

  it('rejeita NODE_ENV desconhecido (erro de digitação no deploy)', () => {
    assert.throws(() => loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'prodution' }), /NODE_ENV/);
  });
});
