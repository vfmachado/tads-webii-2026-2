import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';
import { ADMIN, buildTestRepositories } from '../helpers/fixtures.js';
import type { AccessGrant } from '../../src/modules/access/domain/AccessGrant.js';

const ADMIN_WRITE_PROJECTS: AccessGrant = {
  userId: ADMIN.id,
  moduleName: 'projects',
  permission: 'WRITE',
  grantedAt: new Date(),
};

describe('Módulo de projetos: etapas configuráveis por projeto', () => {
  it('cria um projeto com um workflow customizado e começa na primeira etapa', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));

    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Site novo', stages: ['Descoberta', 'Design', 'Desenvolvimento', 'Entregue'] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Site novo', currentStage: 'Descoberta', isAtFinalStage: false });
  });

  it('rejeita projeto sem etapas', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: [] });
    expect(response.status).toBe(400);
  });

  it('rejeita projeto sem nome', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ stages: ['Backlog'] });
    expect(response.status).toBe(400);
  });

  it('rejeita "stages" que não é um array', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: 'não é array' });
    expect(response.status).toBe(400);
  });

  it('rejeita "stages" que não é uma lista de strings', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: [1, 2] });
    expect(response.status).toBe(400);
  });

  it('rejeita etapas repetidas', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: ['Backlog', 'Backlog'] });
    expect(response.status).toBe(400);
  });

  it('avança um projeto para a próxima etapa', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const created = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: ['Backlog', 'Em andamento'] });

    const response = await request(app)
      .post(`/projects/${created.body.id}/advance`)
      .set('x-user-id', String(ADMIN.id));

    expect(response.status).toBe(200);
    expect(response.body.currentStage).toBe('Em andamento');
    expect(response.body.isAtFinalStage).toBe(true);
  });

  it('não deixa avançar além da última etapa', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const created = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: ['Única'] });

    const response = await request(app)
      .post(`/projects/${created.body.id}/advance`)
      .set('x-user-id', String(ADMIN.id));

    expect(response.status).toBe(409);
  });

  it('retorna 404 ao tentar avançar um projeto inexistente', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app).post('/projects/999/advance').set('x-user-id', String(ADMIN.id));
    expect(response.status).toBe(404);
  });

  it('busca um projeto existente pelo id', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const created = await request(app)
      .post('/projects')
      .set('x-user-id', String(ADMIN.id))
      .send({ name: 'Projeto', stages: ['Backlog'] });

    const response = await request(app).get(`/projects/${created.body.id}`).set('x-user-id', String(ADMIN.id));

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Projeto');
  });

  it('retorna 404 ao buscar um projeto inexistente', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    const response = await request(app).get('/projects/999').set('x-user-id', String(ADMIN.id));
    expect(response.status).toBe(404);
  });

  it('lista todos os projetos', async () => {
    const app = createServer(buildTestRepositories([ADMIN_WRITE_PROJECTS]));
    await request(app).post('/projects').set('x-user-id', String(ADMIN.id)).send({ name: 'A', stages: ['X'] });
    await request(app).post('/projects').set('x-user-id', String(ADMIN.id)).send({ name: 'B', stages: ['Y'] });

    const response = await request(app).get('/projects').set('x-user-id', String(ADMIN.id));
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });
});
