import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import type { EmailSender } from './application/ports/EmailSender.js';
import { RegisterUser } from './application/commands/RegisterUser.js';
import { VerifyUser } from './application/commands/VerifyUser.js';
import { ListUsers } from './application/queries/ListUsers.js';
import { InMemoryDatabase } from './adapters/memory/InMemoryDatabase.js';
import { InMemoryUserRepository } from './adapters/memory/InMemoryUserRepository.js';
import { InMemoryUserQueries } from './adapters/memory/InMemoryUserQueries.js';
import { RandomCodeGenerator } from './adapters/code/RandomCodeGenerator.js';
import { ConsoleEmailSender } from './adapters/email/ConsoleEmailSender.js';
import { NodemailerEmailSender } from './adapters/email/NodemailerEmailSender.js';
import { createUserRoutes } from './adapters/http/userRoutes.js';
import { errorHandler } from './adapters/http/errorHandler.js';
import { loadConfig, type AppConfig } from './config.js';

/**
 * HEXAGONAL: COMPOSITION ROOT. É o único arquivo que:
 *   1. lê `process.env` (validado pelo Zod em `config.ts`);
 *   2. conhece os adaptadores concretos;
 *   3. conecta adaptadores -> portas -> casos de uso -> HTTP.
 *
 * A escolha da estratégia de e-mail acontece em `createEmailSender()`:
 * trocar `EMAIL_STRATEGY` no `.env` muda o comportamento da aplicação
 * sem alterar uma linha do domínio nem dos casos de uso.
 */

// Mensagens de validação do Zod em português (vale para toda a aplicação).
z.config(z.locales.pt());

const config = loadConfig(process.env);

function createEmailSender(email: AppConfig['email']): EmailSender {
  if (email.strategy === 'nodemailer') {
    return new NodemailerEmailSender(email.smtp);
  }
  return new ConsoleEmailSender();
}

// --- adaptadores secundários ---
// CQRS: escrita e leitura têm portas e adaptadores próprios, mas
// compartilham o mesmo armazenamento.
const db = new InMemoryDatabase();
const userRepository = new InMemoryUserRepository(db);
const userQueries = new InMemoryUserQueries(db);
const emailSender = createEmailSender(config.email);
const codeGenerator = new RandomCodeGenerator();

// --- commands (escrita) e queries (leitura): recebem só interfaces ---
const registerUser = new RegisterUser(userRepository, emailSender, codeGenerator);
const verifyUser = new VerifyUser(userRepository);
const listUsers = new ListUsers(userQueries);

// --- adaptador primário HTTP ---
const app = express();
app.use(express.json());
app.use('/users', createUserRoutes({ registerUser, verifyUser, listUsers }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Cadastro rodando em http://localhost:${config.port} (e-mail: ${emailSender.constructor.name})`);
});
