import type { NextFunction, Request, Response } from 'express';
import { NotImplementedError } from './errors.js';
import { InvalidCardColumnError, InvalidCardTitleError, InvalidPriorityError } from '../cards/errors.js';
import { ColumnNotFoundError, InvalidColumnNameError } from '../boards/errors.js';

/**
 * Ponto único de tradução "erro de domínio -> status HTTP". Ao criar um
 * novo erro de domínio (ex.: `CardNotFoundError`, `DuplicateCardTitleError`,
 * `WipLimitExceededError` — todos mencionados nas atividades propostas),
 * registrem o mapeamento aqui. Erros não registrados caem em 500.
 */
const STATUS_BY_ERROR = new Map<Function, number>([
  [NotImplementedError, 501],
  [InvalidCardTitleError, 400],
  [InvalidCardColumnError, 400],
  [InvalidPriorityError, 400],
  [InvalidColumnNameError, 400],
  [ColumnNotFoundError, 404],
]);

// Os 4 parâmetros são obrigatórios: é assim que o Express reconhece uma
// função como error handler (em vez de um middleware comum).
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const status = STATUS_BY_ERROR.get(err.constructor) ?? 500;
  res.status(status).render('error', { status, message: err.message });
}
