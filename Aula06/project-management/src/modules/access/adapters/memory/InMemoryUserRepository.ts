import type { User } from '../../domain/User.js';
import type { UserRepository } from '../../application/ports/UserRepository.js';

/**
 * HEXAGONAL: adaptador secundário (driven/out adapter). Implementação em
 * memória da porta `UserRepository` — troca por uma tabela real (Postgres,
 * como nas Aulas 04/05) sem que `CheckModuleAccess`, `GrantModuleAccess`
 * etc. percebam qualquer diferença, porque eles só conhecem a interface.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<number, User>();

  constructor(seedUsers: User[] = []) {
    for (const user of seedUsers) {
      this.users.set(user.id, user);
    }
  }

  findById(id: number): User | undefined {
    return this.users.get(id);
  }
}
