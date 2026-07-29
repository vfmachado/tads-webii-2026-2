import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/server.js';

describe('GET /api/tasks', () => {
  it('retorna as tarefas em JSON para o navegador montar a interface', async () => {
    const app = createServer();
    const response = await request(app).get('/api/tasks');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

describe('GET /', () => {
  it('serve o casco HTML sem as tarefas já renderizadas (isso é feito no navegador)', async () => {
    const app = createServer();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('id="app"');
    // Diferente do exemplo SSR: o HTML inicial NÃO contém os dados.
    expect(response.text).not.toContain('Configurar ambiente Node.js + TypeScript');
  });
});
