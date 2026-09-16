import type { User } from '../../domain/User.js';
import type { AccessGrant } from '../../domain/AccessGrant.js';

/**
 * HEXAGONAL: dado de exemplo para o adaptador secundário em memória — não
 * é domínio nem porta, é só o "fixture" que faz a API já nascer com algo
 * para demonstrar em aula. Ana é ADMIN e já chega com acesso de escrita a
 * `projects` e leitura a `reports`. Bruno é MEMBER e começa SEM nenhuma
 * concessão — é o cenário da atividade "peça acesso, tente de novo"
 * descrita no README (seção "Testando o fluxo").
 */
export const SEED_USERS: User[] = [
  { id: 1, name: 'Ana (admin)', role: 'ADMIN' },
  { id: 2, name: 'Bruno (membro)', role: 'MEMBER' },
];

const SEEDED_AT = new Date('2026-01-01T00:00:00Z');

export const SEED_GRANTS: AccessGrant[] = [
  { userId: 1, moduleName: 'projects', permission: 'WRITE', grantedAt: SEEDED_AT },
  { userId: 1, moduleName: 'reports', permission: 'READ', grantedAt: SEEDED_AT },
];
