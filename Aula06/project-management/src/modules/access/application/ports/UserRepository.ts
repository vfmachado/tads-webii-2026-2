import type { User } from '../../domain/User.js';

/**
 * HEXAGONAL: porta de saída (secondary/driven port). Interface que a
 * camada de aplicação usa para buscar usuários — ela não sabe, e não
 * precisa saber, se por trás existe um array em memória, um Postgres ou
 * uma chamada a outro serviço. Quem implementa esta interface é um
 * adaptador secundário (ver `adapters/memory/InMemoryUserRepository.ts`).
 */
export interface UserRepository {
  findById(id: number): User | undefined;
}
