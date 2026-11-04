import type { Report } from '../../domain/Report.js';

/** HEXAGONAL: porta de saída. Onde a API guarda o estado dos relatórios. */
export interface ReportRepository {
  save(report: Report): Promise<void>;
  findById(id: string): Promise<Report | undefined>;
  /** Mais recentes primeiro. */
  list(limit: number): Promise<Report[]>;
}
