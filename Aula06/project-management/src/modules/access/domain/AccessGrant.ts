import type { Permission } from '../../../shared/kernel/Permission.js';

/**
 * HEXAGONAL: domínio (núcleo) — a peça central do requisito desta aula.
 * Um `AccessGrant` é o registro de "o usuário X pode fazer Y no módulo Z".
 * Como ele é só um dado lido do repositório a CADA checagem (nunca
 * embutido em token/sessão nem cacheado em memória do processo HTTP), uma
 * concessão feita pelo administrador vale a partir da PRÓXIMA requisição
 * do usuário — sem logout/login e sem invalidar cache nenhum.
 */
export interface AccessGrant {
  readonly userId: number;
  readonly moduleName: string;
  readonly permission: Permission;
  readonly grantedAt: Date;
}
