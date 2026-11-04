import { QueueUnavailableError } from '../../domain/errors.js';
import { Report } from '../../domain/Report.js';
import type { ReportFilters } from '../../domain/ReportFilters.js';
import type { ReportRepository } from '../ports/ReportRepository.js';
import type { ReportRequestPublisher } from '../ports/ReportRequestPublisher.js';
import { toReportView, type ReportView } from '../views.js';

export interface RequestReportInput {
  email: string;
  filters: ReportFilters;
}

/**
 * HEXAGONAL + CQRS: COMMAND. Registra o pedido e o coloca na fila.
 *
 * Repare no que este caso de uso NÃO faz: ele não gera o relatório. Ele
 * responde em milissegundos, e o trabalho pesado acontece depois, em outro
 * processo (`relatorios-worker`). Na HTTP isso vira um `202 Accepted`.
 *
 * ATENÇÃO (dual write): são duas gravações em dois sistemas diferentes,
 * o repositório e o Kafka. Se a segunda falhar, marcamos o relatório como
 * FAILED e devolvemos 503. Isso não cobre todos os casos (e se a API cair
 * ENTRE as duas linhas?). A solução completa é o padrão *Transactional
 * Outbox*, discutido em `Aula11/modelagem.md`.
 */
export class RequestReport {
  constructor(
    private readonly reports: ReportRepository,
    private readonly publisher: ReportRequestPublisher,
  ) {}

  async execute(input: RequestReportInput): Promise<ReportView> {
    const report = Report.request(input.email, input.filters);
    await this.reports.save(report);

    try {
      await this.publisher.publish({
        reportId: report.id,
        email: report.email,
        filters: report.filters,
        requestedAt: report.requestedAt,
      });
    } catch (err) {
      console.error(`[api] falha ao enfileirar o relatório ${report.id}:`, (err as Error).message);
      report.fail('Não foi possível enfileirar o pedido');
      await this.reports.save(report);
      throw new QueueUnavailableError();
    }

    return toReportView(report);
  }
}
