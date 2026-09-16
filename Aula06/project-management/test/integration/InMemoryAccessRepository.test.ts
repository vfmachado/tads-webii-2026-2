import { describe, expect, it } from 'vitest';
import { InMemoryAccessRepository } from '../../src/modules/access/adapters/memory/InMemoryAccessRepository.js';
import type { AccessGrant } from '../../src/modules/access/domain/AccessGrant.js';

describe('InMemoryAccessRepository', () => {
  it('não encontra concessão antes de ser salva', () => {
    const repository = new InMemoryAccessRepository();
    expect(repository.findGrant(1, 'projects')).toBeUndefined();
  });

  it('salva e encontra uma concessão', () => {
    const repository = new InMemoryAccessRepository();
    const grant: AccessGrant = { userId: 1, moduleName: 'projects', permission: 'READ', grantedAt: new Date() };

    repository.save(grant);

    expect(repository.findGrant(1, 'projects')).toEqual(grant);
  });

  it('uma nova concessão para o mesmo par usuário/módulo sobrescreve a anterior', () => {
    const repository = new InMemoryAccessRepository();
    repository.save({ userId: 1, moduleName: 'projects', permission: 'READ', grantedAt: new Date() });
    repository.save({ userId: 1, moduleName: 'projects', permission: 'WRITE', grantedAt: new Date() });

    expect(repository.findGrant(1, 'projects')?.permission).toBe('WRITE');
  });

  it('revoga uma concessão', () => {
    const repository = new InMemoryAccessRepository();
    repository.save({ userId: 1, moduleName: 'projects', permission: 'READ', grantedAt: new Date() });

    repository.revoke(1, 'projects');

    expect(repository.findGrant(1, 'projects')).toBeUndefined();
  });

  it('lista as concessões de um usuário específico', () => {
    const repository = new InMemoryAccessRepository();
    repository.save({ userId: 1, moduleName: 'projects', permission: 'READ', grantedAt: new Date() });
    repository.save({ userId: 1, moduleName: 'reports', permission: 'READ', grantedAt: new Date() });
    repository.save({ userId: 2, moduleName: 'projects', permission: 'READ', grantedAt: new Date() });

    expect(repository.listByUser(1)).toHaveLength(2);
  });

  it('aceita concessões semeadas no construtor', () => {
    const grant: AccessGrant = { userId: 1, moduleName: 'projects', permission: 'WRITE', grantedAt: new Date() };
    const repository = new InMemoryAccessRepository([grant]);
    expect(repository.findGrant(1, 'projects')).toEqual(grant);
  });
});
