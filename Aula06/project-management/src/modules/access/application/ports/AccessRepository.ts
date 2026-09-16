import type { AccessGrant } from '../../domain/AccessGrant.js';

/**
 * HEXAGONAL: porta de saída (secondary/driven port). Contrato de
 * persistência das concessões de acesso. `findGrant` é o método mais
 * importante desta aula: é ele que `CheckModuleAccess` chama em TODA
 * requisição protegida — nunca há cache de permissão em sessão/token, por
 * isso uma concessão feita pelo admin já vale na próxima chamada do
 * usuário.
 */
export interface AccessRepository {
  findGrant(userId: number, moduleName: string): AccessGrant | undefined;
  save(grant: AccessGrant): void;
  revoke(userId: number, moduleName: string): void;
  listByUser(userId: number): AccessGrant[];
}
