import express, { type Express } from 'express';
import { z } from 'zod';
import { MarkReportCompleted, MarkReportFailed } from './application/commands/RecordReportResult.js';
import { RequestReport } from './application/commands/RequestReport.js';
import type { ReportFileStorage } from './application/ports/ReportFileStorage.js';
import type { ReportRepository } from './application/ports/ReportRepository.js';
import type { ReportRequestPublisher } from './application/ports/ReportRequestPublisher.js';
import { GetReport, GetReportDownloadUrl, ListReports } from './application/queries/reportQueries.js';
import { errorHandler } from './adapters/http/errorHandler.js';
import { createRoutes } from './adapters/http/routes.js';

z.config(z.locales.pt());

export interface AppDeps {
  reports: ReportRepository;
  publisher: ReportRequestPublisher;
  storage: ReportFileStorage;
}

/**
 * HEXAGONAL: COMPOSITION ROOT (a parte que não depende de rede). Recebe
 * os adaptadores secundários prontos e devolve o app HTTP e os casos de
 * uso que o consumidor do Kafka vai chamar.
 *
 * Os testes passam adaptadores falsos (em memória) e sobem a API sem
 * Kafka nem S3. Quem liga os adaptadores reais é o `index.ts`.
 */
export function createApp({ reports, publisher, storage }: AppDeps) {
  const requestReport = new RequestReport(reports, publisher);
  const markCompleted = new MarkReportCompleted(reports);
  const markFailed = new MarkReportFailed(reports);

  const app: Express = express();
  app.use(express.json());
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    createRoutes({
      requestReport,
      getReport: new GetReport(reports),
      listReports: new ListReports(reports),
      getDownloadUrl: new GetReportDownloadUrl(reports, storage),
    }),
  );
  app.use(errorHandler);

  return { app, markCompleted, markFailed };
}
