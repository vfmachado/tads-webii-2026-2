import { Partitioners } from 'kafkajs';
import { GenerateReport } from './application/commands/GenerateReport.js';
import { loadConfig } from './config.js';
import { KafkaReportEventPublisher } from './adapters/kafka/KafkaReportEventPublisher.js';
import { createKafka } from './adapters/kafka/kafkaClient.js';
import { startReportRequestsConsumer } from './adapters/kafka/reportRequestsConsumer.js';
import { MockSalesDatabase } from './adapters/mock/MockSalesDatabase.js';
import { S3ReportStorage } from './adapters/s3/S3ReportStorage.js';

/**
 * HEXAGONAL: COMPOSITION ROOT do worker. O worker não tem HTTP: a única
 * porta de entrada é o tópico `report.requested`.
 *
 * Para escalar: `docker compose up -d --scale relatorios-worker=3`.
 */
const config = loadConfig(process.env);
const kafka = createKafka(`${config.KAFKA_CLIENT_ID}-${config.WORKER_ID}`, config.KAFKA_BROKERS);

const storage = new S3ReportStorage({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  bucket: config.S3_BUCKET,
  accessKeyId: config.S3_ACCESS_KEY,
  secretAccessKey: config.S3_SECRET_KEY,
});
await storage.ensureBucket();

const salesDb = new MockSalesDatabase({
  baseMs: config.REPORT_BASE_MS,
  msPerDay: config.REPORT_MS_PER_DAY,
  failureRate: config.REPORT_FAILURE_RATE,
});

const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
// sessionTimeout: se o Kafka ficar 30 s sem heartbeat deste membro, considera
// que ele morreu e redistribui as partições dele.
const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID, sessionTimeout: 30_000, heartbeatInterval: 3_000 });
await producer.connect();
await consumer.connect();

const generateReport = new GenerateReport(salesDb, storage, new KafkaReportEventPublisher(producer), {
  workerId: config.WORKER_ID,
  maxAttempts: config.REPORT_MAX_ATTEMPTS,
});

await startReportRequestsConsumer(consumer, generateReport, config.WORKER_ID);
console.log(
  `[worker] ${config.WORKER_ID} pronto: ${salesDb.size.toLocaleString('pt-BR')} vendas simuladas, ` +
    `peso = ${config.REPORT_BASE_MS} ms + ${config.REPORT_MS_PER_DAY} ms/dia, falhas = ${config.REPORT_FAILURE_RATE * 100}%`,
);

// Desligamento limpo: `disconnect` espera a mensagem atual terminar, confirma
// o offset e sai do grupo, e o Kafka redistribui as partições na hora.
async function shutdown(signal: string) {
  console.log(`[worker] ${signal} recebido, saindo do grupo...`);
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
