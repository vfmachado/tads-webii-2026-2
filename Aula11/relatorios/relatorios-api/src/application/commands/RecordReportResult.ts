import type { ReportResult } from '../../domain/Report.js';
import type { ReportRepository } from '../ports/ReportRepository.js';

/**
 * HEXAGONAL + CQRS: COMMANDS disparados por EVENTOS, não por HTTP.
 *
 * Quem chama estes casos de uso é o adaptador primário do Kafka
 * (`adapters/kafka/reportResultsConsumer.ts`), quando chega uma mensagem
 * em `report.completed` ou `report.failed`. Para o hexágono, um consumidor
 * de fila é só mais uma porta de ENTRADA, como uma rota HTTP.
 */
export class MarkReportCompleted {
  constructor(private readonly reports: ReportRepository) {}

  /** Devolve `false` quando a mensagem foi ignorada (duplicada ou relatório desconhecido). */
  async execute(input: { reportId: string } & ReportResult): Promise<boolean> {
    const report = await this.reports.findById(input.reportId);
    if (!report) return false;
    const { reportId: _, ...result } = input;
    if (!report.complete(result)) return false;
    await this.reports.save(report);
    return true;
  }
}

export class MarkReportFailed {
  constructor(private readonly reports: ReportRepository) {}

  async execute(input: { reportId: string; reason: string }): Promise<boolean> {
    const report = await this.reports.findById(input.reportId);
    if (!report) return false;
    if (!report.fail(input.reason)) return false;
    await this.reports.save(report);
    return true;
  }
}
