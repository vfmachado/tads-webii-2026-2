import type { ListUsersFilter, Page, UserQueries, UserSummary } from '../ports/UserQueries.js';

/**
 * HEXAGONAL + CQRS: query (lado da LEITURA). Não altera nada, não carrega
 * entidades e não passa pelo domínio: pede à porta `UserQueries` os dados
 * já no formato de resposta.
 *
 * Ela é propositalmente fina — só repassa. Mantê-la mesmo assim é uma
 * escolha discutida em `../../../../cqrs.md` (seção "A query é só um
 * repasse?"): é aqui que entraria, por exemplo, uma regra de "quem pode
 * ver a lista de usuários".
 */
export type ListUsersInput = ListUsersFilter;

export class ListUsers {
  constructor(private readonly queries: UserQueries) {}

  async execute(input: ListUsersInput): Promise<Page<UserSummary>> {
    return this.queries.list(input);
  }
}
