import { setTimeout as sleep } from 'node:timers/promises';
import { consolidateSales } from '../../domain/SalesReport.js';
import type { ReportFilters } from '../../domain/ReportFilters.js';
import { toCsv } from '../csv.js';
import type { ReportCompleted, ReportEventPublisher } from '../ports/ReportEventPublisher.js';
import type { ReportStorage } from '../ports/ReportStorage.js';
import type { ProgressCallback, SalesRepository } from '../ports/SalesRepository.js';

export interface GenerateReportInput {
  reportId: string;
  email: string;
  filters: ReportFilters;
}

export interface GenerateReportOptions {
  /** Identifica a réplica do worker (no Docker, o hostname do contêiner). */
  workerId: string;
  maxAttempts?: number;
  retryDelayMs?: number;
  log?: boolean;
}

/**
 * HEXAGONAL + CQRS: COMMAND. O trabalho pesado, que saiu da requisição HTTP:
 *
 *   1. consultar as vendas (lento: depende do tamanho do período)
 *   2. consolidar (regra do domínio)
 *   3. gravar o CSV no storage
 *   4. publicar `report.completed`
 *
 * Falhas nos passos 1 a 3 (banco instável, storage fora do ar) são
 * tentadas de novo até `maxAttempts`. Esgotadas as tentativas, o worker
 * publica `report.failed`: o usuário precisa saber que não vai receber.
 *
 * Se o passo 4 falhar, o erro SOBE de propósito: o consumidor do Kafka não
 * confirma a mensagem (commit do offset) e ela será entregue de novo. O
 * reprocessamento é seguro porque o upload usa sempre a mesma chave
 * (`reports/<id>.csv`) e quem consome os eventos ignora duplicados.
 */
export class GenerateReport {
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly log: boolean;

  constructor(
    private readonly sales: SalesRepository,
    private readonly storage: ReportStorage,
    private readonly events: ReportEventPublisher,
    private readonly options: GenerateReportOptions,
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.log = options.log ?? true;
  }

  async execute(input: GenerateReportInput, onProgress: ProgressCallback = async () => {}): Promise<'completed' | 'failed'> {
    const startedAt = performance.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      let result: Omit<ReportCompleted, 'durationMs'>;
      try {
        result = await this.generate(input, onProgress);
      } catch (err) {
        lastError = err as Error;
        this.info(`relatório ${input.reportId}: tentativa ${attempt}/${this.maxAttempts} falhou (${lastError.message})`);
        if (attempt < this.maxAttempts) {
          await onProgress(0); // avisa o Kafka que seguimos vivos durante a espera
          await sleep(this.retryDelayMs * attempt);
        }
        continue;
      }

      // Fora do try: se publicar falhar, o erro sobe (ver comentário da classe).
      await this.events.completed({ ...result, durationMs: Math.round(performance.now() - startedAt) });
      return 'completed';
    }

    await this.events.failed({
      reportId: input.reportId,
      email: input.email,
      reason: lastError?.message ?? 'erro desconhecido',
      attempts: this.maxAttempts,
      processedBy: this.options.workerId,
    });
    return 'failed';
  }

  private async generate(input: GenerateReportInput, onProgress: ProgressCallback): Promise<Omit<ReportCompleted, 'durationMs'>> {
    const sales = await this.sales.findSales(input.filters, onProgress);
    const report = consolidateSales(sales, input.filters);
    const file = await this.storage.upload(`reports/${input.reportId}.csv`, toCsv(report), 'text/csv; charset=utf-8');
    return {
      reportId: input.reportId,
      email: input.email,
      file,
      summary: report.totals,
      processedBy: this.options.workerId,
    };
  }

  private info(message: string): void {
    if (this.log) console.log(`[worker] ${message}`);
  }
}
