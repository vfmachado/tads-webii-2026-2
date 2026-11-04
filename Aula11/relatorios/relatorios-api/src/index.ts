import { Partitioners } from 'kafkajs';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { KafkaReportRequestPublisher } from './adapters/kafka/KafkaReportRequestPublisher.js';
import { createKafka } from './adapters/kafka/kafkaClient.js';
import { startReportResultsConsumer } from './adapters/kafka/reportResultsConsumer.js';
import { InMemoryReportRepository } from './adapters/memory/InMemoryReportRepository.js';
import { S3ReportFileStorage } from './adapters/s3/S3ReportFileStorage.js';

/**
 * HEXAGONAL: COMPOSITION ROOT (a parte com rede). Liga os adaptadores
 * reais: Kafka (produtor + consumidor) e S3 (presigned URL).
 *
 * A API tem DOIS papéis no Kafka:
 *   - PRODUTORA de `report.requested`;
 *   - CONSUMIDORA de `report.completed` e `report.failed` (grupo `relatorios-api`).
 */
const config = loadConfig(process.env);
const kafka = createKafka(config.KAFKA_CLIENT_ID, config.KAFKA_BROKERS);

const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
await producer.connect();
await consumer.connect();

const { app, markCompleted, markFailed } = createApp({
  reports: new InMemoryReportRepository(),
  publisher: new KafkaReportRequestPublisher(producer),
  storage: new S3ReportFileStorage({
    publicEndpoint: config.S3_PUBLIC_ENDPOINT,
    region: config.S3_REGION,
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  }),
});

await startReportResultsConsumer(consumer, { markCompleted, markFailed });

const server = app.listen(config.PORT, () => {
  console.log(`[api] relatorios-api em http://localhost:${config.PORT} (Kafka: ${config.KAFKA_BROKERS.join(',')})`);
});

// Desligamento limpo: sair do grupo de consumidores AVISA o Kafka, que
// redistribui as partições na hora (sem esperar o session timeout).
async function shutdown(signal: string) {
  console.log(`[api] ${signal} recebido, desligando...`);
  server.close();
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
