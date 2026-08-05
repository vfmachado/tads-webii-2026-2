import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * Testa a "View" (EJS) do projeto antes/. Como o template calcula contagens
 * e formata dados sozinho, o teste só consegue verificar o resultado final
 * em HTML — não há como testar "a contagem de pendentes" isoladamente,
 * porque ela não existe fora do `.ejs` (mesmo problema de testabilidade
 * das rotas JSON, agora na View).
 */
describe('GET /', () => {
  it('renderiza uma página HTML vazia quando não há tarefas', async () => {
    const app = createServer();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Nenhuma tarefa cadastrada ainda');
  });

  it('renderiza a lista de tarefas com contagem de pendentes/concluídas', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Aprender EJS' });
    await request(app).post(`/tasks/${created.body.id}/complete`);
    await request(app).post('/tasks').send({ title: 'Outra tarefa' });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Aprender EJS');
    expect(response.text).toContain('Concluída');
    expect(response.text).toContain('1 pendente(s), 1 concluída(s)');
  });
});
