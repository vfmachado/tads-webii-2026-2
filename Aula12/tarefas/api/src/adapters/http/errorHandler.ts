import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { InvalidTaskTitleError, TaskNotFoundError } from '../../domain/errors.js';

/** Traduz erros do domínio em HTTP. Nunca devolve stack trace ao cliente. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Requisição inválida', details: err.issues.map((i) => i.message) });
  } else if (err instanceof InvalidTaskTitleError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof TaskNotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido' });
  } else {
    console.error('[api] erro inesperado:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
