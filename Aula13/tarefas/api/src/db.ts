import pg from 'pg';

/**
 * `max` = conexões por instância da API. Escalar a API horizontalmente
 * MULTIPLICA as conexões no banco: 6 réplicas × 10 = 60 conexões.
 */
export function createPool(connectionString: string, max = 10): pg.Pool {
  const pool = new pg.Pool({ connectionString, max, connectionTimeoutMillis: 5_000 });
  // Sem este handler, um erro em conexão ociosa derruba o processo.
  pool.on('error', (err) => console.error('[db] erro em conexão ociosa:', err.message));
  return pool;
}
