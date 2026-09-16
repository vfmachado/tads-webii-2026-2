/**
 * HEXAGONAL: domínio (núcleo). Entidade `User` da perspectiva do módulo de
 * acesso — só o suficiente para decidir "quem pode conceder/revogar
 * acesso" (role `ADMIN`). Autenticação de verdade (senha, sessão) é
 * assunto da Aula 05; aqui ela é deliberadamente simplificada (ver
 * `adapters/http/currentUser.ts`) para não competir com o foco desta
 * aula, que é arquitetura hexagonal e autorização modular.
 */
export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  readonly id: number;
  readonly name: string;
  readonly role: UserRole;
}
