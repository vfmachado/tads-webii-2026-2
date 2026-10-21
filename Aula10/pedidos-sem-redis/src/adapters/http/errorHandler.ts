import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { InvalidQuantityError, OutOfStockError, ProductNotFoundError } from '../../domain/errors.js';

/** HEXAGONAL: único lugar que traduz erro -> status HTTP. */
const STATUS_BY_ERROR = new Map<Function, number>([
  [InvalidQuantityError, 400],
  [ProductNotFoundError, 404],
  [OutOfStockError, 409],
]);

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Requisição inválida',
      details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if ('type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'O corpo da requisição não é um JSON válido' });
    return;
  }

  const status = STATUS_BY_ERROR.get(err.constructor);
  if (status) {
    res.status(status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno' });
}
