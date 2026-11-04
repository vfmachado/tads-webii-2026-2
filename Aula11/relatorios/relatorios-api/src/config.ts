import { z } from 'zod';

/**
 * Composition root: valida o ambiente UMA vez, na inicialização (Aula 09).
 * Os padrões servem para rodar FORA do Docker (`npm run dev`); dentro do
 * Docker, o `docker-compose.yml` sobrescreve os endereços.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3011),
  KAFKA_BROKERS: z
    .string()
    .default('localhost:9094')
    .transform((s) => s.split(',').map((b) => b.trim())),
  KAFKA_CLIENT_ID: z.string().default('relatorios-api'),
  KAFKA_GROUP_ID: z.string().default('relatorios-api'),
  S3_PUBLIC_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('aula11'),
  S3_SECRET_KEY: z.string().default('aula11-secret'),
});

export type AppConfig = z.output<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error(`Configuração inválida:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  return result.data;
}
