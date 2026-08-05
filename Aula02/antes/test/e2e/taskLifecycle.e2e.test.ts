import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * Teste E2E: simula, numa única execução, a jornada completa de um cliente
 * HTTP usando a API do início ao fim — criar, listar, renomear, concluir,
 * tentar excluir uma tarefa concluída e criar/excluir outra tarefa comum.
 * Nenhum passo conhece detalhes internos do servidor; tudo passa pela
 * interface pública (HTTP), como um cliente real faria.
 */
describe('Jornada completa de gerenciamento de tarefas', () => {
  it('cobre criação, listagem, renomeação, conclusão e exclusão', async () => {
    const app = createServer();

    const created = await request(app).post('/tasks').send({ title: 'Aprender MVC' });
    expect(created.status).toBe(201);
    const taskId = created.body.id;

    const afterCreateList = await request(app).get('/tasks');
    expect(afterCreateList.body).toHaveLength(1);

    const renamed = await request(app).put(`/tasks/${taskId}`).send({ title: 'Aprender MVC na prática' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.title).toBe('Aprender MVC na prática');

    const completed = await request(app).post(`/tasks/${taskId}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('done');

    const blockedRename = await request(app).put(`/tasks/${taskId}`).send({ title: 'Não deveria funcionar' });
    expect(blockedRename.status).toBe(409);

    const blockedDelete = await request(app).delete(`/tasks/${taskId}`);
    expect(blockedDelete.status).toBe(409);

    const secondTask = await request(app).post('/tasks').send({ title: 'Tarefa descartável' });
    const deleted = await request(app).delete(`/tasks/${secondTask.body.id}`);
    expect(deleted.status).toBe(204);

    const finalList = await request(app).get('/tasks');
    expect(finalList.body).toHaveLength(1);
    expect(finalList.body[0].id).toBe(taskId);
    expect(finalList.body[0].status).toBe('done');
  });
});
