import type { ReportFilters } from '../../domain/ReportFilters.js';
import type { Sale } from '../../domain/SalesReport.js';

/**
 * Chamado de tempos em tempos durante uma consulta demorada. O worker usa
 * para avisar o Kafka "ainda estou vivo" (heartbeat), mas a porta não sabe
 * disso: para ela, é só um callback de progresso.
 */
export type ProgressCallback = (percent: number) => Promise<void>;

/** HEXAGONAL: porta de saída. A consulta pesada ao banco de vendas. */
export interface SalesRepository {
  findSales(filters: ReportFilters, onProgress: ProgressCallback): Promise<Sale[]>;
}
