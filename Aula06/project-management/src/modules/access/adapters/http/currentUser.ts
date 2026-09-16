import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { UserRepository } from '../../application/ports/UserRepository.js';
import type { User } from '../../domain/User.js';
import { UnauthenticatedError } from '../../../../shared/errors.js';

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

/**
 * HEXAGONAL: adaptador primário (driving/in adapter) de infraestrutura
 * transversal. Não é um caso de uso — só traduz um detalhe de transporte
 * (o cabeçalho `x-user-id`) para o conceito de domínio `User`, usando a
 * porta `UserRepository`. Autenticação real (senha, cookie de sessão) é o
 * tema da Aula 05; aqui ela é deliberadamente simplificada para não
 * disputar atenção com o assunto desta aula. Lançar o erro de forma
 * síncrona funciona porque o Express captura exceções síncronas em
 * middlewares automaticamente e as encaminha para `errorHandler.ts`.
 */
export function createCurrentUserMiddleware(userRepository: UserRepository): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header('x-user-id');
    const userId = header ? Number(header) : NaN;
    const user = Number.isInteger(userId) ? userRepository.findById(userId) : undefined;

    if (!user) {
      throw new UnauthenticatedError();
    }

    req.currentUser = user;
    next();
  };
}
