import { NotifyUser } from './application/commands/NotifyUser.js';
import type { Notifier } from './application/ports/Notifier.js';
import { loadConfig } from './config.js';
import { ConsoleNotifier } from './adapters/email/ConsoleNotifier.js';
import { SmtpNotifier } from './adapters/email/SmtpNotifier.js';
import { createKafka } from './adapters/kafka/kafkaClient.js';
import { startReportEventsConsumer } from './adapters/kafka/reportEventsConsumer.js';
import { InMemoryNotificationLog } from './adapters/memory/InMemoryNotificationLog.js';

/** HEXAGONAL: COMPOSITION ROOT. Só consumidor: este serviço não publica nada. */
const config = loadConfig(process.env);

const notifier: Notifier =
  config.EMAIL_STRATEGY === 'smtp'
    ? new SmtpNotifier(config.SMTP_HOST, config.SMTP_PORT, config.EMAIL_FROM)
    : new ConsoleNotifier();
const notifyUser = new NotifyUser(notifier, new InMemoryNotificationLog(), config.PUBLIC_API_URL);

const kafka = createKafka(config.KAFKA_CLIENT_ID, config.KAFKA_BROKERS);
const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
await consumer.connect();
await startReportEventsConsumer(consumer, notifyUser);
console.log(`[notificacoes] ouvindo report.completed e report.failed (e-mail: ${config.EMAIL_STRATEGY})`);

async function shutdown(signal: string) {
  console.log(`[notificacoes] ${signal} recebido, desligando...`);
  await consumer.disconnect();
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
