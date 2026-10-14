import { z } from 'zod';
import type { SmtpConfig } from './adapters/email/NodemailerEmailSender.js';

/**
 * HEXAGONAL: o `.env` também é uma entrada vinda de fora do hexágono —
 * tudo nele é string (ou ausente). Este arquivo faz parte da composition
 * root: valida o ambiente UMA vez, na inicialização, e entrega objetos já
 * tipados para os adaptadores.
 *
 * Se a configuração estiver errada, a aplicação nem sobe (fail fast), em
 * vez de quebrar só quando o primeiro usuário tentar se cadastrar.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3009),
  EMAIL_STRATEGY: z.enum(['console', 'nodemailer']).default('console'),
});

// Só é exigido quando EMAIL_STRATEGY=nodemailer.
const smtpSchema = z
  .object({
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    EMAIL_FROM: z.string().min(1).default('Cadastro <no-reply@example.com>'),
  })
  .transform((env): SmtpConfig => ({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  }));

export type AppConfig = {
  port: number;
  email: { strategy: 'console' } | { strategy: 'nodemailer'; smtp: SmtpConfig };
};

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const base = parseOrExit(envSchema, env);
  if (base.EMAIL_STRATEGY === 'nodemailer') {
    return { port: base.PORT, email: { strategy: 'nodemailer', smtp: parseOrExit(smtpSchema, env) } };
  }
  return { port: base.PORT, email: { strategy: 'console' } };
}

function parseOrExit<T extends z.ZodType>(schema: T, env: NodeJS.ProcessEnv): z.output<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    console.error(`Configuração inválida no .env:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  return result.data;
}
