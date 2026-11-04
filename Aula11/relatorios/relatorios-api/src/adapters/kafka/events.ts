import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CATEGORIES, REGIONS } from '../../domain/ReportFilters.js';

/**
 * O CONTRATO das mensagens que trafegam no Kafka. Para o Kafka, uma
 * mensagem é só um punhado de bytes: quem dá significado a eles são o
 * produtor e o consumidor, que precisam concordar sobre este formato.
 *
 * O mesmo contrato está copiado em `relatorios-worker` e `notificacoes`
 * (e documentado em `Aula11/relatorios/README.md`). Mudar um campo aqui
 * sem mudar lá quebra o sistema, por isso:
 *
 *   - só ACRESCENTE campos opcionais (compatível com quem já consome);
 *   - quem consome VALIDA com Zod e não confia no que chegou.
 */
export const TOPICS = {
  requested: 'report.requested',
  completed: 'report.completed',
  failed: 'report.failed',
} as const;

const envelope = {
  /** Identificador único da MENSAGEM (não do relatório). */
  eventId: z.uuid(),
  occurredAt: z.iso.datetime(),
  reportId: z.uuid(),
  email: z.email(),
};

export const reportRequestedEvent = z.object({
  ...envelope,
  filters: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    region: z.enum(REGIONS).optional(),
    category: z.enum(CATEGORIES).optional(),
  }),
});

export const reportCompletedEvent = z.object({
  ...envelope,
  file: z.object({ bucket: z.string(), key: z.string(), sizeBytes: z.number().int().nonnegative() }),
  summary: z.object({ salesCount: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative() }),
  processedBy: z.string(),
  durationMs: z.number().nonnegative(),
});

export const reportFailedEvent = z.object({
  ...envelope,
  reason: z.string(),
  attempts: z.number().int().positive(),
  processedBy: z.string(),
});

export type ReportRequestedEvent = z.infer<typeof reportRequestedEvent>;
export type ReportCompletedEvent = z.infer<typeof reportCompletedEvent>;
export type ReportFailedEvent = z.infer<typeof reportFailedEvent>;

export function newEnvelope() {
  return { eventId: randomUUID(), occurredAt: new Date().toISOString() };
}
