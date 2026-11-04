import type { Consumer, EachMessagePayload } from 'kafkajs';
import type { NotifyUser } from '../../application/commands/NotifyUser.js';
import { reportCompletedEvent, reportFailedEvent, TOPICS } from './events.js';

/**
 * HEXAGONAL: adaptador PRIMÁRIO. Grupo `notificacoes`.
 *
 * A API também lê `report.completed`, com o grupo `relatorios-api`. Os
 * dois grupos têm offsets INDEPENDENTES: cada um recebe todas as mensagens,
 * no seu ritmo. Se este serviço ficar fora do ar por uma hora, ao voltar
 * ele continua de onde parou e manda os e-mails atrasados; a API não é
 * afetada.
 */
export async function startReportEventsConsumer(consumer: Consumer, notifyUser: NotifyUser): Promise<void> {
  await consumer.subscribe({ topics: [TOPICS.completed, TOPICS.failed], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      let json: unknown;
      try {
        json = JSON.parse(message.value?.toString() ?? '');
      } catch {
        json = undefined;
      }

      if (topic === TOPICS.completed) {
        const parsed = reportCompletedEvent.safeParse(json);
        if (!parsed.success) return skip(topic, partition, message.offset);
        const { reportId, email, summary } = parsed.data;
        const sent = await notifyUser.reportReady({ reportId, email, ...summary });
        if (!sent) console.log(`[kafka] ← ${topic}: ${reportId} já notificado, ignorado`);
        return;
      }

      const parsed = reportFailedEvent.safeParse(json);
      if (!parsed.success) return skip(topic, partition, message.offset);
      const sent = await notifyUser.reportFailed(parsed.data);
      if (!sent) console.log(`[kafka] ← ${topic}: ${parsed.data.reportId} já notificado, ignorado`);
    },
  });
}

function skip(topic: string, partition: number, offset: string): void {
  console.error(`[kafka] ${topic}/${partition}@${offset}: mensagem fora do contrato, ignorada`);
}
