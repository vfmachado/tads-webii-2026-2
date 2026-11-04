import { hostname } from 'node:os';
import { z } from 'zod';

/** Composition root: valida o ambiente uma vez (Aula 09). */
const envSchema = z.object({
  KAFKA_BROKERS: z
    .string()
    .default('localhost:9094')
    .transform((s) => s.split(',').map((b) => b.trim())),
  KAFKA_CLIENT_ID: z.string().default('relatorios-worker'),
  KAFKA_GROUP_ID: z.string().default('relatorios-workers'),
  /** No Docker, cada réplica tem um hostname diferente (o id do contêiner). */
  WORKER_ID: z.string().default(hostname()),

  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('relatorios'),
  S3_ACCESS_KEY: z.string().default('aula11'),
  S3_SECRET_KEY: z.string().default('aula11-secret'),

  /** O "peso" simulado do relatório: base + dias × msPorDia. */
  REPORT_BASE_MS: z.coerce.number().nonnegative().default(1000),
  REPORT_MS_PER_DAY: z.coerce.number().nonnegative().default(15),
  REPORT_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  REPORT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
});

export type WorkerConfig = z.output<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error(`Configuração inválida:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  return result.data;
}
