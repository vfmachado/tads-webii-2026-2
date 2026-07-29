import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/server.js';

describe('GET /', () => {
  it('retorna a página já com as tarefas renderizadas no HTML (SSR)', async () => {
    const app = createServer();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    // Diferente do exemplo CSR: o conteúdo já vem pronto no HTML,
    // sem depender de JavaScript rodando no navegador.
    expect(response.text).toContain('Configurar ambiente Node.js + TypeScript');
  });
});

describe('GET /api/tasks', () => {
  it('também expõe as tarefas em JSON', async () => {
    const app = createServer();
    const response = await request(app).get('/api/tasks');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
