import type { User } from '../../domain/User.js';

/**
 * HEXAGONAL + CQRS: o "banco" em memória, compartilhado pelos dois
 * adaptadores — `InMemoryUserRepository` (escrita) e `InMemoryUserQueries`
 * (leitura). É o equivalente, aqui, a um `PrismaClient` que os dois
 * adaptadores Prisma receberiam pelo construtor.
 *
 * CQRS separa os CAMINHOS de escrita e leitura no código; neste projeto
 * os dois continuam lendo e gravando o MESMO armazenamento.
 */
export class InMemoryDatabase {
  readonly users = new Map<string, User>();
}
