import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * Testa a fiação real da View HTML: rota `GET /` -> `controller.list()` ->
 * `toTaskListViewModel` -> template `.ejs`. Diferente do projeto antes/,
 * o template não decide nada — todo o "poder de decisão" já foi exercido
 * antes de chegar nele, então este teste também serve como prova de que
 * a View (`taskView.ts`) está de fato formatando os dados.
 */
describe('GET /', () => {
  it('renderiza uma página HTML vazia quando não há tarefas', async () => {
    const app = createServer();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Nenhuma tarefa cadastrada ainda');
  });

  it('renderiza a lista de tarefas com rótulo de status formatado pela View', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Aprender EJS' });
    await request(app).post(`/tasks/${created.body.id}/complete`);

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Aprender EJS');
    expect(response.text).toContain('Concluída');
  });
});
