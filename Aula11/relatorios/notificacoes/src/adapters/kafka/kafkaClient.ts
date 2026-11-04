import { Kafka, logLevel } from 'kafkajs';

/**
 * Cria o cliente do Kafka (biblioteca `kafkajs`). O mesmo objeto `Kafka`
 * fabrica produtores (`kafka.producer()`) e consumidores
 * (`kafka.consumer({ groupId })`).
 *
 * `brokers` é só a lista de ENTRADA (bootstrap): o cliente conecta em um
 * deles, descobre o cluster inteiro e passa a falar direto com o broker
 * líder de cada partição.
 */
export function createKafka(clientId: string, brokers: string[]): Kafka {
  return new Kafka({
    clientId,
    brokers,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 300, retries: 10 },
  });
}
