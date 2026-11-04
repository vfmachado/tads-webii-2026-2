import type { ReportRepository } from '../../application/ports/ReportRepository.js';
import type { Report } from '../../domain/Report.js';

/**
 * HEXAGONAL: adaptador secundário em memória. Suficiente para a aula,
 * com duas limitações que valem discussão (ver `Aula11/modelagem.md`):
 *
 *   - reiniciou a API, perdeu o histórico de relatórios;
 *   - com DUAS instâncias da API, cada uma tem o seu Map. Um pedido feito
 *     na instância A pode ter o `report.completed` lido pela instância B.
 *     Para escalar a API, este adaptador precisa virar Redis/PostgreSQL.
 */
export class InMemoryReportRepository implements ReportRepository {
  private readonly reports = new Map<string, Report>();

  async save(report: Report): Promise<void> {
    this.reports.set(report.id, report);
  }

  async findById(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async list(limit: number): Promise<Report[]> {
    return [...this.reports.values()]
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .slice(0, limit);
  }
}
