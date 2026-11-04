import { z } from 'zod';

/**
 * A cópia do CONTRATO que interessa a este serviço. Repare que ela é
 * MENOR que a do worker: o serviço de notificações só valida os campos que
 * usa. Se o worker acrescentar um campo amanhã, nada aqui quebra (o Zod
 * ignora campos extras por padrão). Isso é o que permite que cada serviço
 * evolua sem deploy coordenado.
 */
export const TOPICS = {
  completed: 'report.completed',
  failed: 'report.failed',
} as const;

const envelope = {
  eventId: z.uuid(),
  reportId: z.uuid(),
  email: z.email(),
};

export const reportCompletedEvent = z.object({
  ...envelope,
  summary: z.object({ salesCount: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative() }),
});

export const reportFailedEvent = z.object({
  ...envelope,
  reason: z.string(),
});
