import pg from 'pg';

export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
  // Sem este handler, um erro em conexão ociosa derruba o processo.
  pool.on('error', (err) => console.error('[db] erro em conexão ociosa:', err.message));
  return pool;
}
