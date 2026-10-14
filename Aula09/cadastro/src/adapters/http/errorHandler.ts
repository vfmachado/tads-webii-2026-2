import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  EmailAlreadyRegisteredError,
  InvalidUserDataError,
  InvalidVerificationCodeError,
  UserAlreadyVerifiedError,
  UserNotFoundError,
} from '../../domain/errors.js';

/**
 * HEXAGONAL: único lugar que traduz erro -> status HTTP.
 *
 * Agora há duas origens de 400:
 *   - `ZodError`: a requisição veio mal formada (erro do ADAPTADOR);
 *     respondemos com a lista de campos problemáticos.
 *   - `InvalidUserDataError`: o formato estava certo, mas o dado viola
 *     uma regra de negócio (erro do DOMÍNIO).
 *
 * Erros desconhecidos viram 500 com mensagem genérica, para que detalhes
 * internos (ex.: falha de SMTP) não vazem para o cliente.
 */
const STATUS_BY_ERROR = new Map<Function, number>([
  [InvalidUserDataError, 400],
  [InvalidVerificationCodeError, 400],
  [UserNotFoundError, 404],
  [EmailAlreadyRegisteredError, 409],
  [UserAlreadyVerifiedError, 409],
]);

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Requisição inválida',
      details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  // O `express.json()` lança este erro quando o corpo nem é um JSON válido.
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
