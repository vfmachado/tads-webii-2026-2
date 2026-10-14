import type { User } from '../../domain/User.js';

/**
 * HEXAGONAL + CQRS: porta de saída do lado da ESCRITA (commands).
 *
 * Só tem o que os commands precisam: buscar UMA entidade para aplicar
 * uma regra e salvar o novo estado. Na Aula 08 ela também tinha um
 * `findAll()`, que só existia para a listagem; com o CQRS a leitura
 * ganhou a sua própria porta (`UserQueries`) e este método saiu daqui.
 *
 * Os métodos são assíncronos mesmo com a implementação em memória:
 * assim um futuro adaptador Prisma encaixa sem mudar nenhum command.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
}
