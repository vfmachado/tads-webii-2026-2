import type { AccessGrant } from '../../domain/AccessGrant.js';
import type { AccessRepository } from '../../application/ports/AccessRepository.js';

/**
 * HEXAGONAL: adaptador secundário (driven/out adapter). Guarda as
 * concessões numa `Map` chaveada por `userId:moduleName` — um grant novo
 * para o mesmo par usuário/módulo sobrescreve o antigo, que é o
 * comportamento esperado ao "atualizar" um acesso (ex.: trocar READ por
 * WRITE sem precisar revogar antes).
 */
export class InMemoryAccessRepository implements AccessRepository {
  private readonly grants = new Map<string, AccessGrant>();

  constructor(seedGrants: AccessGrant[] = []) {
    for (const grant of seedGrants) {
      this.save(grant);
    }
  }

  private key(userId: number, moduleName: string): string {
    return `${userId}:${moduleName}`;
  }

  findGrant(userId: number, moduleName: string): AccessGrant | undefined {
    return this.grants.get(this.key(userId, moduleName));
  }

  save(grant: AccessGrant): void {
    this.grants.set(this.key(grant.userId, grant.moduleName), grant);
  }

  revoke(userId: number, moduleName: string): void {
    this.grants.delete(this.key(userId, moduleName));
  }

  listByUser(userId: number): AccessGrant[] {
    return [...this.grants.values()].filter((grant) => grant.userId === userId);
  }
}
