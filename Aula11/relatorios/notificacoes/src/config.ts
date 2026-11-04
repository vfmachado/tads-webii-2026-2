import { z } from 'zod';

/** Composition root: valida o ambiente uma vez (Aula 09). */
const envSchema = z.object({
  KAFKA_BROKERS: z
    .string()
    .default('localhost:9094')
    .transform((s) => s.split(',').map((b) => b.trim())),
  KAFKA_CLIENT_ID: z.string().default('notificacoes'),
  KAFKA_GROUP_ID: z.string().default('notificacoes'),
  /** Endereço da API que o USUÁRIO enxerga (vai no link do e-mail). */
  PUBLIC_API_URL: z.url().default('http://localhost:3011'),
  EMAIL_STRATEGY: z.enum(['console', 'smtp']).default('smtp'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  EMAIL_FROM: z.string().default('Relatórios <relatorios@loja.example>'),
});

export type NotificationsConfig = z.output<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): NotificationsConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error(`Configuração inválida:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  return result.data;
}
