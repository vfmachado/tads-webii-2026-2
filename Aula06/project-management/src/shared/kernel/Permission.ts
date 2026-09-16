/**
 * HEXAGONAL + DDD: um "Shared Kernel" — um pedacinho de modelo que módulos
 * diferentes concordam em compartilhar, em vez de cada um duplicar sua
 * própria noção de permissão. `Permission` é usado pelo domínio do módulo
 * `access` (`AccessGrant`) e pelos roteadores HTTP de QUALQUER módulo de
 * negócio (`projects`, `reports`) para declarar o que exigem — sem que
 * esses módulos precisem importar nada um do outro.
 *
 * `WRITE` inclui `READ` (quem pode escrever também pode ler); a regra de
 * comparação vive aqui, num único lugar, em vez de espalhada pelos
 * middlewares que a usam.
 */
export type Permission = 'READ' | 'WRITE';

const RANK: Record<Permission, number> = { READ: 1, WRITE: 2 };

export function satisfies(granted: Permission, required: Permission): boolean {
  return RANK[granted] >= RANK[required];
}
