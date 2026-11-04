import type { Producer } from 'kafkajs';
import type {
  ReportCompleted,
  ReportEventPublisher,
  ReportFailed,
} from '../../application/ports/ReportEventPublisher.js';
import { newEnvelope, TOPICS, type ReportCompletedEvent, type ReportFailedEvent } from './events.js';

/**
 * HEXAGONAL: adaptador secundário. Publica o resultado em
 * `report.completed` ou `report.failed`, com a mesma chave (`reportId`)
 * do pedido.
 */
export class KafkaReportEventPublisher implements ReportEventPublisher {
  constructor(
    private readonly producer: Producer,
    private readonly log = true,
  ) {}

  async completed(event: ReportCompleted): Promise<void> {
    const message: ReportCompletedEvent = { ...newEnvelope(), ...event };
    await this.send(TOPICS.completed, message.reportId, message);
  }

  async failed(event: ReportFailed): Promise<void> {
    const message: ReportFailedEvent = { ...newEnvelope(), ...event };
    await this.send(TOPICS.failed, message.reportId, message);
  }

  private async send(topic: string, key: string, value: object): Promise<void> {
    const [meta] = await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value), headers: { 'event-type': topic } }],
    });
    if (this.log) console.log(`[kafka] → ${topic} partição ${meta?.partition} offset ${meta?.baseOffset} (relatório ${key})`);
  }
}
