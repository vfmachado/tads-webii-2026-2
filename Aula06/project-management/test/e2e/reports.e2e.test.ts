import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';
import { ADMIN, buildTestRepositories } from '../helpers/fixtures.js';
import type { AccessGrant } from '../../src/modules/access/domain/AccessGrant.js';

describe('Módulo de relatórios: reaproveita a porta de projects, autorização própria', () => {
  it('resume a quantidade de projetos por etapa', async () => {
    const grants: AccessGrant[] = [
      { userId: ADMIN.id, moduleName: 'projects', permission: 'WRITE', grantedAt: new Date() },
      { userId: ADMIN.id, moduleName: 'reports', permission: 'READ', grantedAt: new Date() },
    ];
    const app = createServer(buildTestRepositories(grants));

    await request(app).post('/projects').set('x-user-id', String(ADMIN.id)).send({ name: 'A', stages: ['Backlog'] });
    await request(app).post('/projects').set('x-user-id', String(ADMIN.id)).send({ name: 'B', stages: ['Backlog'] });

    const response = await request(app).get('/reports/summary').set('x-user-id', String(ADMIN.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ totalProjects: 2, byStage: { Backlog: 2 } });
  });

  it('acesso a projects não dá acesso automático a reports', async () => {
    const grants: AccessGrant[] = [
      { userId: ADMIN.id, moduleName: 'projects', permission: 'WRITE', grantedAt: new Date() },
    ];
    const app = createServer(buildTestRepositories(grants));

    const response = await request(app).get('/reports/summary').set('x-user-id', String(ADMIN.id));
    expect(response.status).toBe(403);
  });
});
