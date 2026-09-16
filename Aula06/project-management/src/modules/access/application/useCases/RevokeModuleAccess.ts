import type { AccessRepository } from '../ports/AccessRepository.js';
import type { UserRepository } from '../ports/UserRepository.js';
import type { User } from '../../domain/User.js';
import { ForbiddenError } from '../../../../shared/errors.js';
import { UserNotFoundError } from '../../domain/errors.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). Espelha `GrantModuleAccess`
 * para o caminho de revogação — mesma regra de "só ADMIN pode", mesma
 * separação entre decisão de negócio (aqui) e transporte HTTP (no
 * Controller). Revogar um módulo desconhecido não é erro: é só um no-op
 * (não existe grant para apagar), por isso não há checagem de
 * `isKnownModule` aqui como existe em `GrantModuleAccess`.
 */
export class RevokeModuleAccess {
  constructor(
    private readonly accessRepository: AccessRepository,
    private readonly userRepository: UserRepository,
  ) {}

  execute(actingUser: User, targetUserId: number, moduleName: string): void {
    if (actingUser.role !== 'ADMIN') {
      throw new ForbiddenError('Apenas administradores podem revogar acesso a um módulo');
    }
    const targetUser = this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(targetUserId);
    }

    this.accessRepository.revoke(targetUserId, moduleName);
  }
}
