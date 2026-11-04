import type { Producer } from 'kafkajs';
import type { ReportRequest, ReportRequestPublisher } from '../../application/ports/ReportRequestPublisher.js';
import { newEnvelope, TOPICS, type ReportRequestedEvent } from './events.js';

/**
 * HEXAGONAL: adaptador secundário. Implementa a porta
 * `ReportRequestPublisher` publicando no tópico `report.requested`.
 *
 * Três decisões que só existem aqui (o caso de uso não sabe delas):
 *
 *   - `key: reportId`. A CHAVE decide a PARTIÇÃO (hash da chave % nº de
 *     partições). Chaves diferentes se espalham pelas 3 partições e,
 *     portanto, pelos 3 workers. Se a chave fosse o e-mail, todos os
 *     relatórios de um mesmo usuário cairiam na mesma partição, em ordem.
 *   - `value`: o JSON do contrato (`events.ts`).
 *   - `headers`: metadados que não fazem parte do contrato (útil para
 *     filtrar/rastrear sem abrir o JSON).
 */
export class KafkaReportRequestPublisher implements ReportRequestPublisher {
  constructor(
    private readonly producer: Producer,
    private readonly log = true,
  ) {}

  async publish(request: ReportRequest): Promise<void> {
    const event: ReportRequestedEvent = {
      ...newEnvelope(),
      reportId: request.reportId,
      email: request.email,
      filters: request.filters,
    };

    // `acks: -1` (padrão): o broker só confirma depois de gravar a mensagem.
    const [meta] = await this.producer.send({
      topic: TOPICS.requested,
      messages: [
        {
          key: event.reportId,
          value: JSON.stringify(event),
          headers: { 'event-type': TOPICS.requested, 'content-type': 'application/json' },
        },
      ],
    });

    if (this.log) {
      console.log(
        `[kafka] → ${TOPICS.requested} partição ${meta?.partition} offset ${meta?.baseOffset} (relatório ${event.reportId})`,
      );
    }
  }
}
