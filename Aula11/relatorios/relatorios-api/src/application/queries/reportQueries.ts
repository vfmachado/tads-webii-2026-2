import { ReportNotFoundError, ReportNotReadyError } from '../../domain/errors.js';
import type { ReportFileStorage } from '../ports/ReportFileStorage.js';
import type { ReportRepository } from '../ports/ReportRepository.js';
import { toReportView, type ReportView } from '../views.js';

/** CQRS: QUERY. O usuário (ou o front) consulta o status com *polling*. */
export class GetReport {
  constructor(private readonly reports: ReportRepository) {}

  async execute(id: string): Promise<ReportView> {
    const report = await this.reports.findById(id);
    if (!report) throw new ReportNotFoundError(id);
    return toReportView(report);
  }
}

export class ListReports {
  constructor(private readonly reports: ReportRepository) {}

  async execute(limit = 50): Promise<ReportView[]> {
    return (await this.reports.list(limit)).map(toReportView);
  }
}

/**
 * CQRS: QUERY. Gera, NA HORA, um link temporário para o arquivo.
 *
 * Por que não colocar a URL pronta na mensagem do Kafka? Porque uma
 * presigned URL expira. O e-mail aponta para a API
 * (`/reports/:id/download`) e a API gera um link novo a cada clique.
 */
export class GetReportDownloadUrl {
  constructor(
    private readonly reports: ReportRepository,
    private readonly storage: ReportFileStorage,
    private readonly expiresInSeconds = 300,
  ) {}

  async execute(id: string): Promise<string> {
    const report = await this.reports.findById(id);
    if (!report) throw new ReportNotFoundError(id);
    if (report.status !== 'COMPLETED' || !report.result) throw new ReportNotReadyError(id, report.status);
    return this.storage.createDownloadUrl(report.result.file, this.expiresInSeconds);
  }
}
