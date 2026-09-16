import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';
import { ADMIN, MEMBER, buildTestRepositories } from '../helpers/fixtures.js';

/**
 * Este arquivo é a demonstração central da aula: autorização por módulo é
 * checada a cada requisição (nunca cacheada), então uma concessão feita
 * pelo admin já vale na PRÓXIMA chamada do usuário — sem logout/login.
 */
describe('Autorização por módulo, configurável em tempo de execução', () => {
  it('barra o acesso a um módulo sem concessão', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app).get('/projects').set('x-user-id', String(MEMBER.id));

    expect(response.status).toBe(403);
  });

  it('libera o acesso já na PRÓXIMA requisição após o admin conceder', async () => {
    const app = createServer(buildTestRepositories());

    const before = await request(app).get('/projects').set('x-user-id', String(MEMBER.id));
    expect(before.status).toBe(403);

    const grantResponse = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: MEMBER.id, moduleName: 'projects', permission: 'READ' });
    expect(grantResponse.status).toBe(201);

    const after = await request(app).get('/projects').set('x-user-id', String(MEMBER.id));
    expect(after.status).toBe(200);
  });

  it('READ não é suficiente para uma rota que exige WRITE', async () => {
    const app = createServer(
      buildTestRepositories([
        { userId: MEMBER.id, moduleName: 'projects', permission: 'READ', grantedAt: new Date() },
      ]),
    );

    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(MEMBER.id))
      .send({ name: 'Projeto', stages: ['Backlog'] });

    expect(response.status).toBe(403);
  });

  it('revogar o acesso bloqueia a próxima requisição', async () => {
    const app = createServer(
      buildTestRepositories([
        { userId: MEMBER.id, moduleName: 'projects', permission: 'READ', grantedAt: new Date() },
      ]),
    );

    const before = await request(app).get('/projects').set('x-user-id', String(MEMBER.id));
    expect(before.status).toBe(200);

    const revokeResponse = await request(app)
      .delete('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: MEMBER.id, moduleName: 'projects' });
    expect(revokeResponse.status).toBe(204);

    const after = await request(app).get('/projects').set('x-user-id', String(MEMBER.id));
    expect(after.status).toBe(403);
  });

  it('um MEMBER não pode conceder acesso a ninguém', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(MEMBER.id))
      .send({ targetUserId: MEMBER.id, moduleName: 'projects', permission: 'READ' });

    expect(response.status).toBe(403);
  });

  it('rejeita conceder acesso a um módulo desconhecido', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: MEMBER.id, moduleName: 'billing', permission: 'READ' });

    expect(response.status).toBe(400);
  });

  it('rejeita conceder acesso a um usuário inexistente', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: 999, moduleName: 'projects', permission: 'READ' });

    expect(response.status).toBe(404);
  });

  it('um MEMBER não pode revogar acesso de ninguém', async () => {
    const app = createServer(
      buildTestRepositories([
        { userId: MEMBER.id, moduleName: 'projects', permission: 'READ', grantedAt: new Date() },
      ]),
    );

    const response = await request(app)
      .delete('/access/grants')
      .set('x-user-id', String(MEMBER.id))
      .send({ targetUserId: MEMBER.id, moduleName: 'projects' });

    expect(response.status).toBe(403);
  });

  it('rejeita corpo de concessão com permissão inválida', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: MEMBER.id, moduleName: 'projects', permission: 'RUN' });

    expect(response.status).toBe(400);
  });

  it('rejeita corpo de concessão sem targetUserId válido', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ moduleName: 'projects', permission: 'READ' });

    expect(response.status).toBe(400);
  });

  it('rejeita corpo de concessão sem moduleName', async () => {
    const app = createServer(buildTestRepositories());

    const response = await request(app)
      .post('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: MEMBER.id, permission: 'READ' });

    expect(response.status).toBe(400);
  });

  it('exige o cabeçalho x-user-id', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app).get('/projects');
    expect(response.status).toBe(401);
  });

  it('rejeita um x-user-id que não corresponde a nenhum usuário', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app).get('/projects').set('x-user-id', '999');
    expect(response.status).toBe(401);
  });

  it('admin consegue listar as concessões de um usuário', async () => {
    const app = createServer(
      buildTestRepositories([
        { userId: MEMBER.id, moduleName: 'projects', permission: 'READ', grantedAt: new Date() },
      ]),
    );

    const response = await request(app).get(`/access/grants/${MEMBER.id}`).set('x-user-id', String(ADMIN.id));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('membro não pode listar concessões de outro usuário', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app).get(`/access/grants/${ADMIN.id}`).set('x-user-id', String(MEMBER.id));
    expect(response.status).toBe(403);
  });

  it('rejeita revogar com corpo inválido', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app)
      .delete('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: 'x', moduleName: 'projects' });
    expect(response.status).toBe(400);
  });

  it('rejeita revogar sem moduleName', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app)
      .delete('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: MEMBER.id });
    expect(response.status).toBe(400);
  });

  it('rejeita listar concessões de usuário inexistente', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app).get('/access/grants/999').set('x-user-id', String(ADMIN.id));
    expect(response.status).toBe(404);
  });

  it('rejeita revogar acesso de usuário inexistente', async () => {
    const app = createServer(buildTestRepositories());
    const response = await request(app)
      .delete('/access/grants')
      .set('x-user-id', String(ADMIN.id))
      .send({ targetUserId: 999, moduleName: 'projects' });
    expect(response.status).toBe(404);
  });
});
