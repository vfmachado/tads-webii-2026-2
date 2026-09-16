import { describe, expect, it } from 'vitest';
import { CheckModuleAccess } from '../../../src/modules/access/application/useCases/CheckModuleAccess.js';
import type { AccessRepository } from '../../../src/modules/access/application/ports/AccessRepository.js';
import type { AccessGrant } from '../../../src/modules/access/domain/AccessGrant.js';

/**
 * Fake mínimo da porta `AccessRepository` — não é `InMemoryAccessRepository`
 * de propósito. O ponto desta aula é que o caso de uso só depende da
 * INTERFACE; qualquer implementação serve para testá-lo isoladamente, sem
 * tocar em Express nem no adaptador "de verdade".
 */
class FakeAccessRepository implements AccessRepository {
  constructor(private readonly grants: AccessGrant[] = []) {}

  findGrant(userId: number, moduleName: string): AccessGrant | undefined {
    return this.grants.find((g) => g.userId === userId && g.moduleName === moduleName);
  }

  save(): void {}
  revoke(): void {}

  listByUser(): AccessGrant[] {
    return [];
  }
}

describe('CheckModuleAccess', () => {
  it('nega acesso quando não há concessão', () => {
    const useCase = new CheckModuleAccess(new FakeAccessRepository());
    expect(useCase.execute(1, 'projects', 'READ')).toBe(false);
  });

  it('permite quando a permissão concedida satisfaz a exigida', () => {
    const grants: AccessGrant[] = [{ userId: 1, moduleName: 'projects', permission: 'WRITE', grantedAt: new Date() }];
    const useCase = new CheckModuleAccess(new FakeAccessRepository(grants));
    expect(useCase.execute(1, 'projects', 'READ')).toBe(true);
  });

  it('nega quando a permissão concedida é menor que a exigida', () => {
    const grants: AccessGrant[] = [{ userId: 1, moduleName: 'projects', permission: 'READ', grantedAt: new Date() }];
    const useCase = new CheckModuleAccess(new FakeAccessRepository(grants));
    expect(useCase.execute(1, 'projects', 'WRITE')).toBe(false);
  });
});
