import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { createPool } from './db.js';

/** Funciona tanto em src/ (tsx) quanto em dist/ (compilado): ../migrations. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));

const LOCK_ID = 727_274; // número qualquer, o mesmo para todas as instâncias

/**
 * Runner de migrations em ~40 linhas: aplica, em ordem, cada arquivo .sql que
 * ainda não está em `schema_migrations`.
 *
 *  - Cada migration roda em UMA transação: ou aplica inteira, ou nada.
 *  - Um advisory lock impede duas instâncias de migrarem ao mesmo tempo.
 *  - Guarda o checksum: editar uma migration já aplicada é erro (crie outra).
 *  - Idempotente: rodar de novo não faz nada.
 */
export async function runMigrations(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        checksum   TEXT        NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const existing = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations',
    );
    const done = new Map(existing.rows.map((r) => [r.version, r.checksum]));

    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = await readFile(dir + file, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = done.get(file);
      if (previous) {
        if (previous !== checksum) {
          throw new Error(`A migration ${file} já foi aplicada e foi alterada depois. Crie uma migration nova.`);
        }
        continue;
      }
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [file, checksum]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falha na migration ${file}: ${(err as Error).message}`);
      }
      applied.push(file);
      console.log(`[migrate] aplicada ${file}`);
    }
    if (applied.length === 0) console.log('[migrate] banco já está atualizado');
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => undefined);
    client.release();
  }
}

// Executado como script (`node dist/migrate.js`): é o que o serviço `migrate` do compose faz.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[migrate] DATABASE_URL é obrigatória');
    process.exit(1);
  }
  const pool = createPool(url);
  try {
    await runMigrations(pool);
  } catch (err) {
    console.error('[migrate]', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
