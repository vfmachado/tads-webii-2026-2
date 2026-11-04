import { randomUUID } from 'node:crypto';
import { assertValidPeriod, type ReportFilters } from './ReportFilters.js';

/**
 * HEXAGONAL: domínio. O ciclo de vida de um relatório, do ponto de vista
 * da API:
 *
 *   PENDING ──(report.completed)──▶ COMPLETED
 *      │
 *      └─────(report.failed)─────▶ FAILED
 *
 * A API não gera o relatório: ela só registra o pedido e acompanha o que
 * o worker avisa pelo Kafka.
 */
export type ReportStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface ReportFile {
  bucket: string;
  key: string;
  sizeBytes: number;
}

export interface ReportSummary {
  salesCount: number;
  totalCents: number;
}

export interface ReportResult {
  file: ReportFile;
  summary: ReportSummary;
  processedBy: string;
  durationMs: number;
}

export class Report {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly filters: ReportFilters,
    readonly requestedAt: Date,
    private _status: ReportStatus = 'PENDING',
    private _finishedAt?: Date,
    private _result?: ReportResult,
    private _failureReason?: string,
  ) {}

  static request(email: string, filters: ReportFilters, now = new Date()): Report {
    assertValidPeriod(filters);
    return new Report(randomUUID(), email, { ...filters }, now);
  }

  get status(): ReportStatus {
    return this._status;
  }
  get finishedAt(): Date | undefined {
    return this._finishedAt;
  }
  get result(): ReportResult | undefined {
    return this._result;
  }
  get failureReason(): string | undefined {
    return this._failureReason;
  }

  /**
   * Devolve `false` se o relatório já tinha terminado. O Kafka entrega
   * "pelo menos uma vez" (at-least-once): a mesma mensagem pode chegar
   * duas vezes, e a segunda precisa ser ignorada sem erro (IDEMPOTÊNCIA).
   */
  complete(result: ReportResult, at = new Date()): boolean {
    if (this._status !== 'PENDING') return false;
    this._status = 'COMPLETED';
    this._result = result;
    this._finishedAt = at;
    return true;
  }

  fail(reason: string, at = new Date()): boolean {
    if (this._status !== 'PENDING') return false;
    this._status = 'FAILED';
    this._failureReason = reason;
    this._finishedAt = at;
    return true;
  }
}
