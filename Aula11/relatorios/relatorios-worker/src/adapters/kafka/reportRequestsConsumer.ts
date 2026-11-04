import type { Consumer, EachMessagePayload } from 'kafkajs';
import type { GenerateReport } from '../../application/commands/GenerateReport.js';
import { reportRequestedEvent, TOPICS } from './events.js';

/**
 * HEXAGONAL: adaptador PRIMÁRIO. Lê `report.requested` e chama o caso de
 * uso `GenerateReport`.
 *
 * Todas as réplicas do worker usam o MESMO grupo (`relatorios-workers`).
 * O Kafka divide as partições do tópico entre os membros do grupo:
 *
 *   3 partições, 1 worker  → o worker lê as 3
 *   3 partições, 3 workers → cada um lê 1   (3 relatórios em paralelo)
 *   3 partições, 5 workers → 3 trabalham, 2 ficam OCIOSOS
 *
 * O número de partições é o teto de paralelismo de um grupo.
 *
 * Dentro de uma partição, as mensagens são processadas EM ORDEM, uma por
 * vez. Só depois que `eachMessage` termina sem erro o kafkajs confirma o
 * offset (commit). Se o worker cair no meio, outro membro do grupo assume
 * a partição e recomeça do último offset confirmado: a mensagem é
 * entregue de novo (at-least-once).
 */
export async function startReportRequestsConsumer(
  consumer: Consumer,
  generateReport: GenerateReport,
  workerId: string,
  log = true,
): Promise<void> {
  consumer.on(consumer.events.GROUP_JOIN, ({ payload }) => {
    const partitions = payload.memberAssignment[TOPICS.requested] ?? [];
    console.log(
      `[kafka] ${workerId} entrou no grupo "${payload.groupId}": ` +
        (partitions.length ? `partições [${partitions.join(', ')}] de ${TOPICS.requested}` : 'NENHUMA partição (ocioso)'),
    );
  });

  // fromBeginning só vale na PRIMEIRA vez que o grupo consome o tópico (sem
  // offset salvo). Sem ele, pedidos feitos antes do 1º worker subir seriam
  // ignorados. Depois disso, o grupo continua de onde parou.
  await consumer.subscribe({ topic: TOPICS.requested, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat }: EachMessagePayload) => {
      let parsed;
      try {
        parsed = reportRequestedEvent.safeParse(JSON.parse(message.value?.toString() ?? ''));
      } catch {
        parsed = undefined;
      }
      if (!parsed?.success) {
        // Poison pill: lançar erro aqui travaria a partição para sempre.
        // Em produção, a mensagem iria para um tópico de "mensagens mortas" (DLQ).
        console.error(`[kafka] ${topic}/${partition}@${message.offset}: mensagem fora do contrato, ignorada`);
        return;
      }

      const { reportId, email, filters } = parsed.data;
      if (log) console.log(`[kafka] ← ${topic} partição ${partition} offset ${message.offset} (relatório ${reportId})`);

      const outcome = await generateReport.execute({ reportId, email, filters }, async (percent) => {
        if (log && percent > 0 && percent % 50 === 0) console.log(`[worker] ${reportId}: ${percent}%`);
        // Relatório pesado = eachMessage demorado. Sem heartbeat, o Kafka
        // acharia que este worker morreu e daria a partição para outro.
        await heartbeat();
      });

      if (log) console.log(`[worker] ${reportId}: ${outcome === 'completed' ? 'concluído' : 'FALHOU'}`);
    },
  });
}
