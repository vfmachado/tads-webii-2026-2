import type { Report, ReportStatus, ReportSummary } from '../domain/Report.js';
import type { ReportFilters } from '../domain/ReportFilters.js';

/** CQRS: o formato de LEITURA de um relatório (o que as queries devolvem). */
export interface ReportView {
  id: string;
  status: ReportStatus;
  email: string;
  filters: ReportFilters;
  requestedAt: string;
  finishedAt?: string;
  /** Tempo entre o pedido e o fim, incluindo a espera na fila. */
  totalMs?: number;
  /** Tempo de processamento no worker (sem a espera na fila). */
  processingMs?: number;
  processedBy?: string;
  summary?: ReportSummary;
  failureReason?: string;
}

export function toReportView(report: Report): ReportView {
  return {
    id: report.id,
    status: report.status,
    email: report.email,
    filters: report.filters,
    requestedAt: report.requestedAt.toISOString(),
    finishedAt: report.finishedAt?.toISOString(),
    totalMs: report.finishedAt ? report.finishedAt.getTime() - report.requestedAt.getTime() : undefined,
    processingMs: report.result?.durationMs,
    processedBy: report.result?.processedBy,
    summary: report.result?.summary,
    failureReason: report.failureReason,
  };
}
