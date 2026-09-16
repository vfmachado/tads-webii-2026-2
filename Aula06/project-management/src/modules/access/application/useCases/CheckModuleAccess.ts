import type { AccessRepository } from '../ports/AccessRepository.js';
import type { Permission } from '../../../../shared/kernel/Permission.js';
import { satisfies } from '../../../../shared/kernel/Permission.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). Orquestra a pergunta
 * "o usuário X pode fazer Y no módulo Z?" consultando a porta de saída
 * `AccessRepository`. É a peça reaproveitada por QUALQUER adaptador
 * primário que precise checar autorização — hoje só o middleware HTTP
 * `requireModuleAccess`, mas poderia ser uma CLI administrativa ou um
 * worker de fila sem duplicar esta regra.
 *
 * Não há cache algum aqui: cada chamada relê `accessRepository`. É por
 * isso que uma concessão feita pelo admin (`GrantModuleAccess`) já vale
 * na PRÓXIMA requisição do usuário — não existe nada para invalidar.
 */
export class CheckModuleAccess {
  constructor(private readonly accessRepository: AccessRepository) {}

  execute(userId: number, moduleName: string, required: Permission): boolean {
    const grant = this.accessRepository.findGrant(userId, moduleName);
    if (!grant) return false;
    return satisfies(grant.permission, required);
  }
}
