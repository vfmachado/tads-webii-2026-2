import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthenticatedError, ValidationError } from '../errors.js';
import { UnknownModuleError, UserNotFoundError } from '../../modules/access/domain/errors.js';
import {
  DuplicateStageNameError,
  EmptyStageListError,
  InvalidProjectNameError,
  ProjectAlreadyAtFinalStageError,
  ProjectNotFoundError,
} from '../../modules/projects/domain/errors.js';

/**
 * HEXAGONAL: único ponto de tradução "erro de domínio/aplicação -> status
 * HTTP" de toda a aplicação. Mesmo conhecendo erros de módulos diferentes,
 * ele em si não é parte de nenhum módulo de negócio — é infraestrutura
 * compartilhada (por isso mora em `shared/`, não em `modules/access` nem
 * em `modules/projects`). Nenhum Controller escreve `res.status(404)` ao
 * capturar um erro: eles deixam o erro subir, e este arquivo decide o
 * código. Ao criar um novo tipo de erro em qualquer módulo, registrem o
 * mapeamento aqui.
 */
const STATUS_BY_ERROR = new Map<Function, number>([
  [ValidationError, 400],
  [UnauthenticatedError, 401],
  [ForbiddenError, 403],
  [UserNotFoundError, 404],
  [ProjectNotFoundError, 404],
  [UnknownModuleError, 400],
  [EmptyStageListError, 400],
  [DuplicateStageNameError, 400],
  [InvalidProjectNameError, 400],
  [ProjectAlreadyAtFinalStageError, 409],
]);

// Os 4 parâmetros são obrigatórios: é assim que o Express reconhece uma
// função como error handler (em vez de um middleware comum).
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const status = STATUS_BY_ERROR.get(err.constructor) ?? 500;
  res.status(status).json({ error: err.message });
}
