import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import type { ReportFileStorage } from '../src/application/ports/ReportFileStorage.js';
import type { ReportRequest, ReportRequestPublisher } from '../src/application/ports/ReportRequestPublisher.js';
import { InMemoryReportRepository } from '../src/adapters/memory/InMemoryReportRepository.js';
import type { ReportFile } from '../src/domain/Report.js';

/** Publisher falso: guarda o que seria enviado ao Kafka. */
export class FakePublisher implements ReportRequestPublisher {
  readonly published: ReportRequest[] = [];
  failing = false;

  async publish(request: ReportRequest): Promise<void> {
    if (this.failing) throw new Error('broker indisponível (simulado)');
    this.published.push(request);
  }
}

export class FakeStorage implements ReportFileStorage {
  async createDownloadUrl(file: ReportFile, expiresInSeconds: number): Promise<string> {
    return `http://storage.test/${file.bucket}/${file.key}?expires=${expiresInSeconds}`;
  }
}

/** Sobe a API numa porta livre, com Kafka e S3 falsos. */
export async function startApi() {
  const publisher = new FakePublisher();
  const { app, markCompleted, markFailed } = createApp({
    reports: new InMemoryReportRepository(),
    publisher,
    storage: new FakeStorage(),
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://localhost:${port}`,
    publisher,
    markCompleted,
    markFailed,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export const validRequest = {
  email: 'ana@exemplo.com',
  filters: { from: '2026-01-01', to: '2026-03-31', region: 'Sul' },
};

export function postReport(baseUrl: string, body: unknown) {
  return fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}
