import { describe, expect, it } from 'vitest';
import { GrantModuleAccess } from '../../../src/modules/access/application/useCases/GrantModuleAccess.js';
import { InMemoryAccessRepository } from '../../../src/modules/access/adapters/memory/InMemoryAccessRepository.js';
import { InMemoryUserRepository } from '../../../src/modules/access/adapters/memory/InMemoryUserRepository.js';
import { ForbiddenError } from '../../../src/shared/errors.js';
import { UnknownModuleError, UserNotFoundError } from '../../../src/modules/access/domain/errors.js';
import type { User } from '../../../src/modules/access/domain/User.js';

const ADMIN: User = { id: 1, name: 'Admin', role: 'ADMIN' };
const MEMBER: User = { id: 2, name: 'Membro', role: 'MEMBER' };

function buildUseCase() {
  const accessRepository = new InMemoryAccessRepository();
  const userRepository = new InMemoryUserRepository([ADMIN, MEMBER]);
  return { useCase: new GrantModuleAccess(accessRepository, userRepository), accessRepository };
}

describe('GrantModuleAccess', () => {
  it('permite que um ADMIN conceda acesso a um módulo conhecido', () => {
    const { useCase, accessRepository } = buildUseCase();

    useCase.execute(ADMIN, MEMBER.id, 'projects', 'READ');

    expect(accessRepository.findGrant(MEMBER.id, 'projects')?.permission).toBe('READ');
  });

  it('rejeita quando quem concede não é ADMIN', () => {
    const { useCase } = buildUseCase();
    expect(() => useCase.execute(MEMBER, ADMIN.id, 'projects', 'READ')).toThrow(ForbiddenError);
  });

  it('rejeita módulo desconhecido', () => {
    const { useCase } = buildUseCase();
    expect(() => useCase.execute(ADMIN, MEMBER.id, 'billing', 'READ')).toThrow(UnknownModuleError);
  });

  it('rejeita usuário-alvo inexistente', () => {
    const { useCase } = buildUseCase();
    expect(() => useCase.execute(ADMIN, 999, 'projects', 'READ')).toThrow(UserNotFoundError);
  });
});
