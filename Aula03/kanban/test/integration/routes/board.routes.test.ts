import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../../src/server.js';
import { buildTestRepositories } from '../../helpers/fixtures.js';

describe('GET /', () => {
  it('renderiza o quadro com suas colunas', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Quadro de Teste');
    expect(response.text).toContain('Coluna 1');
    expect(response.text).toContain('Coluna 2');
  });
});

describe('POST /columns', () => {
  it('ainda não está implementado e responde 501 (Atividade 7)', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app).post('/columns').send({ name: 'Nova Coluna' });

    expect(response.status).toBe(501);
  });
});
