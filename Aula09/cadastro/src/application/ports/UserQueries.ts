/**
 * HEXAGONAL + CQRS: porta de saída do lado da LEITURA (queries).
 *
 * Diferenças em relação ao `UserRepository`:
 *   - devolve DTOs prontos para exibir (`UserSummary`), não entidades.
 *     Nenhuma regra de negócio roda numa leitura, então não há motivo
 *     para montar um `User` completo (com código de verificação e tudo);
 *   - sabe filtrar e paginar, coisas que o lado da escrita nunca precisa.
 *
 * Ela continua falando a língua do negócio ("usuários verificados,
 * página 2"), não a do banco: não existe `where`, `skip` nem SQL aqui.
 */
export interface UserSummary {
  name: string;
  email: string;
  verified: boolean;
}

export interface ListUsersFilter {
  verified?: boolean;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserQueries {
  list(filter: ListUsersFilter): Promise<Page<UserSummary>>;
}
