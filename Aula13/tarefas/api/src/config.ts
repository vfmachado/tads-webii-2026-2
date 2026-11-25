import { z } from 'zod';

/**
 * Configuração por ambiente (fator III do "12-factor app"): tudo vem de
 * variáveis de ambiente, validado UMA vez na partida. Se faltar algo, o
 * processo falha na hora, com mensagem clara, em vez de quebrar no meio de
 * uma requisição.
 *
 * Na Aula 13 quem define essas variáveis é o Terraform (infra/api.tf).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  /** Identifica a versão publicada (o deploy injeta o TAG/commit). */
  APP_VERSION: z.string().default('dev'),
  /**
   * Conexões abertas por INSTÂNCIA. Com N réplicas, o banco recebe até
   * N × DB_POOL_MAX conexões, e o Postgres aceita 100 por padrão.
   */
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  /**
   * Custo de CPU do relatório (iterações do PBKDF2). Quanto maior, mais CPU
   * cada GET /api/tasks/report consome. Ver application/tasks.ts.
   */
  REPORT_CPU_COST: z.coerce.number().int().min(1).max(10_000_000).default(200_000),
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
