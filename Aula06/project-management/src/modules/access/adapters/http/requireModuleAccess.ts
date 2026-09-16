import type { NextFunction, Request, Response } from 'express';
import type { CheckModuleAccess } from '../../application/useCases/CheckModuleAccess.js';
import type { RequireModuleAccess } from '../../../../shared/http/RequireModuleAccess.js';
import { ForbiddenError } from '../../../../shared/errors.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter) — a implementação
 * real do tipo compartilhado `RequireModuleAccess` (definido em
 * `shared/http/RequireModuleAccess.ts`). É a única peça deste módulo que
 * outros módulos (`projects`, `reports`) recebem — sempre via injeção
 * pela composition root (`server.ts`), nunca por importação direta deste
 * arquivo.
 *
 * Roda DEPOIS do middleware de identidade (`currentUser.ts`) — `server.ts`
 * garante essa ordem ao montar `app.use(currentUser)` antes de qualquer
 * rota. Por isso este middleware confia em `req.currentUser` sem checá-lo
 * de novo: repetir a checagem seria um `if` que nunca teria como dar falso,
 * dada a ordem de composição — código morto disfarçado de defensivo.
 */
export function createRequireModuleAccess(checkModuleAccess: CheckModuleAccess): RequireModuleAccess {
  return (moduleName, permission) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      const allowed = checkModuleAccess.execute(req.currentUser!.id, moduleName, permission);
      if (!allowed) {
        throw new ForbiddenError(
          `Usuário ${req.currentUser!.id} não tem permissão "${permission}" no módulo "${moduleName}"`,
        );
      }
      next();
    };
  };
}
