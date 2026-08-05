import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * TESTE DE INTEGRAÇÃO: sobe o Express real com Controller + Repository
 * reais (nada mockado), batendo em cada endpoint via Supertest. Diferente
 * do unitário, aqui validamos a fiação completa: rota -> controller ->
 * repositório -> view -> resposta HTTP.
 */
describe('Rotas de tarefas (Controller + Repository reais)', () => {
  it('POST /tasks cria e retorna 201', async () => {
    const app = createServer();
    const response = await request(app).post('/tasks').send({ title: 'Rota integrada' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
  });

  it('POST /tasks com título inválido retorna 400', async () => {
    const app = createServer();
    const response = await request(app).post('/tasks').send({ title: 'ab' });

    expect(response.status).toBe(400);
  });

  it('GET /tasks/:id retorna 404 para id inexistente', async () => {
    const app = createServer();
    const response = await request(app).get('/tasks/nao-existe');

    expect(response.status).toBe(404);
  });

  it('PUT /tasks/:id renomeia uma tarefa pendente', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Nome antigo' });

    const response = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'Nome novo' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Nome novo');
  });

  it('POST /tasks/:id/complete conclui e bloqueia nova conclusão', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Concluir via rota' });

    const first = await request(app).post(`/tasks/${created.body.id}/complete`);
    const second = await request(app).post(`/tasks/${created.body.id}/complete`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  it('DELETE /tasks/:id remove tarefa pendente e bloqueia tarefa concluída', async () => {
    const app = createServer();
    const pending = await request(app).post('/tasks').send({ title: 'Pendente' });
    const toComplete = await request(app).post('/tasks').send({ title: 'Será concluída' });
    await request(app).post(`/tasks/${toComplete.body.id}/complete`);

    const deletePending = await request(app).delete(`/tasks/${pending.body.id}`);
    const deleteCompleted = await request(app).delete(`/tasks/${toComplete.body.id}`);

    expect(deletePending.status).toBe(204);
    expect(deleteCompleted.status).toBe(409);
  });
});
