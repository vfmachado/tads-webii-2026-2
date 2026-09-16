import type { AccessRepository } from '../ports/AccessRepository.js';
import type { UserRepository } from '../ports/UserRepository.js';
import type { AccessGrant } from '../../domain/AccessGrant.js';
import type { User } from '../../domain/User.js';
import { ForbiddenError } from '../../../../shared/errors.js';
import { UserNotFoundError } from '../../domain/errors.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). Consulta simples, usada
 * para inspecionar/demonstrar o efeito de um grant recém-criado (ver
 * README, seção "Testando o fluxo"). Continua exigindo ADMIN: um usuário
 * comum não deveria enumerar concessões de outros usuários.
 */
export class ListUserGrants {
  constructor(
    private readonly accessRepository: AccessRepository,
    private readonly userRepository: UserRepository,
  ) {}

  execute(actingUser: User, targetUserId: number): AccessGrant[] {
    if (actingUser.role !== 'ADMIN') {
      throw new ForbiddenError('Apenas administradores podem listar concessões de outro usuário');
    }
    const targetUser = this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(targetUserId);
    }

    return this.accessRepository.listByUser(targetUserId);
  }
}
