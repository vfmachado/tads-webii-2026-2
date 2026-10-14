import type { ListUsersFilter, Page, UserQueries, UserSummary } from '../../application/ports/UserQueries.js';
import type { InMemoryDatabase } from './InMemoryDatabase.js';

/**
 * HEXAGONAL + CQRS: adaptador secundário do lado da LEITURA. Lê o mesmo
 * `InMemoryDatabase` do repositório, mas devolve só os campos da resposta
 * e faz filtro e paginação.
 *
 * Com Prisma, este arquivo seria um `findMany` com `select` (só as colunas
 * necessárias), `where`, `skip` e `take`, mais um `count` — sem nunca
 * montar uma entidade `User`:
 *
 *   const where = filter.verified === undefined ? {} : { verified: filter.verified };
 *   const [items, total] = await Promise.all([
 *     prisma.user.findMany({ where, select: { name: true, email: true, verified: true },
 *                            orderBy: { name: 'asc' },
 *                            skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize }),
 *     prisma.user.count({ where }),
 *   ]);
 */
export class InMemoryUserQueries implements UserQueries {
  constructor(private readonly db: InMemoryDatabase) {}

  async list(filter: ListUsersFilter): Promise<Page<UserSummary>> {
    const matching = [...this.db.users.values()]
      .filter((u) => filter.verified === undefined || u.verified === filter.verified)
      .sort((a, b) => a.name.localeCompare(b.name));

    const start = (filter.page - 1) * filter.pageSize;
    const items = matching
      .slice(start, start + filter.pageSize)
      .map((u) => ({ name: u.name, email: u.email, verified: u.verified }));

    return { items, total: matching.length, page: filter.page, pageSize: filter.pageSize };
  }
}
