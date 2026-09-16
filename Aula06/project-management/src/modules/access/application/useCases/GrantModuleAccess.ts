import type { AccessRepository } from '../ports/AccessRepository.js';
import type { UserRepository } from '../ports/UserRepository.js';
import type { Permission } from '../../../../shared/kernel/Permission.js';
import type { User } from '../../domain/User.js';
import { ForbiddenError } from '../../../../shared/errors.js';
import { UnknownModuleError, UserNotFoundError } from '../../domain/errors.js';
import { isKnownModule } from '../../domain/knownModules.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). A regra de negócio "só um
 * ADMIN pode conceder acesso" mora aqui — não no Controller HTTP nem no
 * repositório. O adaptador primário (`AccessController`) só traduz a
 * requisição HTTP para esta chamada; toda decisão de negócio acontece
 * neste método, e por isso pode ser testada sem subir um servidor Express
 * (ver test/unit/access/GrantModuleAccess.test.ts).
 */
export class GrantModuleAccess {
  constructor(
    private readonly accessRepository: AccessRepository,
    private readonly userRepository: UserRepository,
  ) {}

  execute(actingUser: User, targetUserId: number, moduleName: string, permission: Permission): void {
    if (actingUser.role !== 'ADMIN') {
      throw new ForbiddenError('Apenas administradores podem conceder acesso a um módulo');
    }
    if (!isKnownModule(moduleName)) {
      throw new UnknownModuleError(moduleName);
    }
    const targetUser = this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(targetUserId);
    }

    this.accessRepository.save({ userId: targetUserId, moduleName, permission, grantedAt: new Date() });
  }
}
