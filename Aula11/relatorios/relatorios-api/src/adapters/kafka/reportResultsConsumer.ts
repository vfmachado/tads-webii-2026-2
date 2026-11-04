import type { Consumer, EachMessagePayload } from 'kafkajs';
import type { MarkReportCompleted, MarkReportFailed } from '../../application/commands/RecordReportResult.js';
import { reportCompletedEvent, reportFailedEvent, TOPICS } from './events.js';

/**
 * HEXAGONAL: adaptador PRIMÁRIO (driving). Faz para o Kafka o que as rotas
 * fazem para o HTTP: recebe a entrada, valida o formato e chama o caso de
 * uso.
 *
 * Grupo de consumidores `relatorios-api`. O serviço de notificações lê os
 * MESMOS tópicos com OUTRO grupo (`notificacoes`), e cada grupo recebe
 * TODAS as mensagens: é assim que um evento "avisa" vários serviços
 * (fan-out) sem que o worker saiba quem está ouvindo.
 */
export async function startReportResultsConsumer(
  consumer: Consumer,
  useCases: { markCompleted: MarkReportCompleted; markFailed: MarkReportFailed },
  log = true,
): Promise<void> {
  await consumer.subscribe({ topics: [TOPICS.completed, TOPICS.failed], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      const raw = message.value?.toString() ?? '';
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        // Mensagem "venenosa" (poison pill): se lançássemos erro, o kafkajs
        // tentaria de novo para sempre e a partição ficaria travada.
        console.error(`[kafka] ${topic}/${partition}@${message.offset}: JSON inválido, mensagem ignorada`);
        return;
      }

      if (topic === TOPICS.completed) {
        const parsed = reportCompletedEvent.safeParse(json);
        if (!parsed.success) return logInvalid(topic, partition, message.offset);
        const { reportId, file, summary, processedBy, durationMs } = parsed.data;
        const changed = await useCases.markCompleted.execute({ reportId, file, summary, processedBy, durationMs });
        if (log) console.log(`[kafka] ← ${topic}: ${reportId} ${changed ? 'COMPLETED' : '(ignorado: duplicado ou desconhecido)'}`);
        return;
      }

      const parsed = reportFailedEvent.safeParse(json);
      if (!parsed.success) return logInvalid(topic, partition, message.offset);
      const changed = await useCases.markFailed.execute({ reportId: parsed.data.reportId, reason: parsed.data.reason });
      if (log) console.log(`[kafka] ← ${topic}: ${parsed.data.reportId} ${changed ? 'FAILED' : '(ignorado)'}`);
    },
  });
}

function logInvalid(topic: string, partition: number, offset: string): void {
  console.error(`[kafka] ${topic}/${partition}@${offset}: mensagem fora do contrato, ignorada`);
}
