import type { User } from '../../domain/User.js';
import type { UserRepository } from '../../application/ports/UserRepository.js';
import type { InMemoryDatabase } from './InMemoryDatabase.js';

/**
 * HEXAGONAL: adaptador secundário (driven) do lado da ESCRITA. Implementa
 * `UserRepository` sobre o `InMemoryDatabase`. Trocar por Prisma =
 * escrever `PrismaUserRepository` e mudar UMA linha em `src/index.ts`.
 */
export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return this.db.users.get(email);
  }

  async save(user: User): Promise<void> {
    this.db.users.set(user.email, user);
  }
}
