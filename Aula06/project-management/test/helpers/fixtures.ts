import { InMemoryUserRepository } from '../../src/modules/access/adapters/memory/InMemoryUserRepository.js';
import { InMemoryAccessRepository } from '../../src/modules/access/adapters/memory/InMemoryAccessRepository.js';
import { InMemoryProjectRepository } from '../../src/modules/projects/adapters/memory/InMemoryProjectRepository.js';
import type { Repositories } from '../../src/server.js';
import type { User } from '../../src/modules/access/domain/User.js';
import type { AccessGrant } from '../../src/modules/access/domain/AccessGrant.js';

/**
 * Fixture pequena e controlada para os testes de e2e — de propósito, NÃO
 * usa o seed de demonstração (`src/modules/access/adapters/memory/seed.ts`).
 * Isso mantém esses testes estáveis mesmo que o seed de demonstração mude
 * (mesma filosofia de `test/helpers/fixtures.ts` da Aula 03).
 */
export const ADMIN: User = { id: 1, name: 'Admin de teste', role: 'ADMIN' };
export const MEMBER: User = { id: 2, name: 'Membro de teste', role: 'MEMBER' };

export function buildTestRepositories(seedGrants: AccessGrant[] = []): Repositories {
  return {
    userRepository: new InMemoryUserRepository([ADMIN, MEMBER]),
    accessRepository: new InMemoryAccessRepository(seedGrants),
    projectRepository: new InMemoryProjectRepository(),
  };
}
