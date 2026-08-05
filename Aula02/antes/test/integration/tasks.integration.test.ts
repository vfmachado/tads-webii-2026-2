import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * Testes de INTEGRAÇÃO: cada teste sobe o Express real (`createServer()`) e
 * bate em UM endpoint por vez com Supertest, verificando como as camadas
 * (aqui, todas misturadas num único handler) se comportam juntas.
 *
 * Reparem no que NÃO existe nesta pasta: não há `test/unit/`. Não dá para
 * testar "a regra de título precisa ter 3-120 caracteres" sem subir um
 * servidor HTTP inteiro, porque a regra vive dentro do handler da rota,
 * não em uma função isolada. Isso é o próprio problema que o MVC resolve
 * (ver `depois/`).
 */

describe('POST /tasks', () => {
  it('cria uma tarefa válida', async () => {
    const app = createServer();
    const response = await request(app).post('/tasks').send({ title: 'Estudar MVC' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: 'Estudar MVC', status: 'pending' });
    expect(response.body.id).toBeTypeOf('string');
  });

  it('rejeita título muito curto', async () => {
    const app = createServer();
    const response = await request(app).post('/tasks').send({ title: 'ab' });

    expect(response.status).toBe(400);
  });

  it('rejeita título ausente', async () => {
    const app = createServer();
    const response = await request(app).post('/tasks').send({});

    expect(response.status).toBe(400);
  });

  it('rejeita título duplicado entre tarefas pendentes', async () => {
    const app = createServer();
    await request(app).post('/tasks').send({ title: 'Estudar MVC' });
    const response = await request(app).post('/tasks').send({ title: 'estudar mvc' });

    expect(response.status).toBe(409);
  });
});

describe('GET /tasks', () => {
  it('lista todas as tarefas cadastradas', async () => {
    const app = createServer();
    await request(app).post('/tasks').send({ title: 'Primeira tarefa' });
    await request(app).post('/tasks').send({ title: 'Segunda tarefa' });

    const response = await request(app).get('/tasks');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });
});

describe('GET /tasks/:id', () => {
  it('retorna 404 para id inexistente', async () => {
    const app = createServer();
    const response = await request(app).get('/tasks/id-que-nao-existe');

    expect(response.status).toBe(404);
  });
});

describe('POST /tasks/:id/complete', () => {
  it('marca uma tarefa como concluída', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Concluir aula' });

    const response = await request(app).post(`/tasks/${created.body.id}/complete`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('done');
  });

  it('não permite concluir a mesma tarefa duas vezes', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Concluir aula' });
    await request(app).post(`/tasks/${created.body.id}/complete`);

    const response = await request(app).post(`/tasks/${created.body.id}/complete`);

    expect(response.status).toBe(409);
  });
});

describe('DELETE /tasks/:id', () => {
  it('exclui uma tarefa pendente', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Remover depois' });

    const response = await request(app).delete(`/tasks/${created.body.id}`);

    expect(response.status).toBe(204);
  });

  it('não permite excluir uma tarefa já concluída', async () => {
    const app = createServer();
    const created = await request(app).post('/tasks').send({ title: 'Concluir e tentar excluir' });
    await request(app).post(`/tasks/${created.body.id}/complete`);

    const response = await request(app).delete(`/tasks/${created.body.id}`);

    expect(response.status).toBe(409);
  });
});
