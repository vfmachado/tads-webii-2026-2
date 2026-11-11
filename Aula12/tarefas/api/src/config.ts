import { z } from 'zod';

/**
 * Configuração por ambiente (fator III do "12-factor app"): tudo vem de
 * variáveis de ambiente, validado UMA vez na partida. Se faltar algo, o
 * processo falha na hora, com mensagem clara, em vez de quebrar no meio de
 * uma requisição.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  /** Identifica a versão publicada (o deploy injeta o TAG/commit). */
  APP_VERSION: z.string().default('dev'),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuração inválida:\n${problems}`);
  }
  return result.data;
}
