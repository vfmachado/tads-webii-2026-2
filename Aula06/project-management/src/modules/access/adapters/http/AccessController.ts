import type { Request, Response } from 'express';
import type { GrantModuleAccess } from '../../application/useCases/GrantModuleAccess.js';
import type { RevokeModuleAccess } from '../../application/useCases/RevokeModuleAccess.js';
import type { ListUserGrants } from '../../application/useCases/ListUserGrants.js';
import type { Permission } from '../../../../shared/kernel/Permission.js';
import { ValidationError } from '../../../../shared/errors.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter). Converte
 * requisição/resposta HTTP em chamadas aos casos de uso do módulo de
 * acesso — não decide nada sozinho (nem "quem pode conceder", nem "o
 * módulo existe"): isso é responsabilidade da camada de aplicação. Se
 * amanhã a mesma funcionalidade precisasse de uma CLI administrativa, o
 * caso de uso seria reaproveitado direto, sem este Controller.
 *
 * `req.currentUser!`: a composition root (`server.ts`) monta
 * `app.use(currentUser)` antes de qualquer rota, então todo Controller já
 * recebe a requisição com um usuário identificado — checar de novo aqui
 * seria um `if` que nunca teria como dar falso.
 */
export class AccessController {
  constructor(
    private readonly grantModuleAccess: GrantModuleAccess,
    private readonly revokeModuleAccess: RevokeModuleAccess,
    private readonly listUserGrants: ListUserGrants,
  ) {}

  grant(req: Request, res: Response): void {
    const { targetUserId, moduleName, permission } = parseGrantBody(req.body);
    this.grantModuleAccess.execute(req.currentUser!, targetUserId, moduleName, permission);
    res.status(201).json({ targetUserId, moduleName, permission });
  }

  revoke(req: Request, res: Response): void {
    const { targetUserId, moduleName } = parseRevokeBody(req.body);
    this.revokeModuleAccess.execute(req.currentUser!, targetUserId, moduleName);
    res.status(204).send();
  }

  listGrantsOf(req: Request, res: Response): void {
    const targetUserId = Number(req.params.userId);
    const grants = this.listUserGrants.execute(req.currentUser!, targetUserId);
    res.json(grants);
  }
}

function parseGrantBody(body: unknown): { targetUserId: number; moduleName: string; permission: Permission } {
  const { targetUserId, moduleName, permission } = body as Record<string, unknown>;

  if (typeof targetUserId !== 'number' || !Number.isInteger(targetUserId)) {
    throw new ValidationError('"targetUserId" é obrigatório e deve ser um número inteiro');
  }
  if (typeof moduleName !== 'string' || moduleName.trim().length === 0) {
    throw new ValidationError('"moduleName" é obrigatório');
  }
  if (permission !== 'READ' && permission !== 'WRITE') {
    throw new ValidationError('"permission" deve ser "READ" ou "WRITE"');
  }

  return { targetUserId, moduleName, permission };
}

function parseRevokeBody(body: unknown): { targetUserId: number; moduleName: string } {
  const { targetUserId, moduleName } = body as Record<string, unknown>;

  if (typeof targetUserId !== 'number' || !Number.isInteger(targetUserId)) {
    throw new ValidationError('"targetUserId" é obrigatório e deve ser um número inteiro');
  }
  if (typeof moduleName !== 'string' || moduleName.trim().length === 0) {
    throw new ValidationError('"moduleName" é obrigatório');
  }

  return { targetUserId, moduleName };
}
