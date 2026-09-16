import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * Único teste que chama `createServer()` sem injetar repositórios — ou
 * seja, o servidor real que qualquer pessoa vê ao rodar `npm run dev`,
 * com o seed de demonstração (`src/modules/access/adapters/memory/seed.ts`):
 * Ana (id 1) já nasce com WRITE em "projects" e READ em "reports"; Bruno
 * (id 2) nasce sem nenhuma concessão.
 */
describe('Estado inicial: seed de demonstração', () => {
  it('Ana (admin semeada) já consegue acessar o módulo de projetos', async () => {
    const app = createServer();
    const response = await request(app).get('/projects').set('x-user-id', '1');
    expect(response.status).toBe(200);
  });

  it('Bruno (membro semeado) ainda não tem nenhuma concessão', async () => {
    const app = createServer();
    const response = await request(app).get('/projects').set('x-user-id', '2');
    expect(response.status).toBe(403);
  });
});
