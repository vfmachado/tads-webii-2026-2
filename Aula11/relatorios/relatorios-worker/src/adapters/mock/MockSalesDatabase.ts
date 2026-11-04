import { setTimeout as sleep } from 'node:timers/promises';
import type { ProgressCallback, SalesRepository } from '../../application/ports/SalesRepository.js';
import { CATEGORIES, periodInDays, REGIONS, type ReportFilters } from '../../domain/ReportFilters.js';
import type { Sale } from '../../domain/SalesReport.js';

export interface MockSalesOptions {
  /** Custo fixo de qualquer consulta (abrir conexão, planejar a query...). */
  baseMs: number;
  /** Custo por dia do período: um relatório de um ano pesa mais que um de uma semana. */
  msPerDay: number;
  /** Probabilidade (0 a 1) de a consulta falhar no meio, para exercitar as novas tentativas. */
  failureRate: number;
  log?: boolean;
  /** Etapas em que a espera é dividida; a cada uma o worker manda um heartbeat ao Kafka. */
  steps?: number;
  random?: () => number;
}

const SELLERS = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabi', 'Hugo', 'Iara', 'João', 'Kátia', 'Lucas'];

/**
 * HEXAGONAL: adaptador secundário que SIMULA um banco de vendas grande.
 *
 * Os dados são gerados na inicialização (2025-01-01 a 2026-12-31, ~120
 * vendas por dia, sempre os mesmos por causa da semente fixa). O PESO do
 * relatório é simulado com uma espera proporcional ao período:
 *
 *   tempo = baseMs + dias × msPerDay      (padrão: 1 s + 15 ms/dia)
 *
 *   1 semana  ≈ 1,1 s      3 meses ≈ 2,4 s      1 ano ≈ 6,5 s
 *
 * Num sistema real, aqui estaria um `SELECT ... GROUP BY` de minutos num
 * data warehouse. Para o resto do worker, não faz diferença.
 */
export class MockSalesDatabase implements SalesRepository {
  private readonly sales: Sale[];
  private readonly steps: number;
  private readonly random: () => number;

  constructor(private readonly options: MockSalesOptions) {
    this.sales = generateSales('2025-01-01', '2026-12-31', 120);
    this.steps = options.steps ?? 10;
    this.random = options.random ?? Math.random;
  }

  get size(): number {
    return this.sales.length;
  }

  async findSales(filters: ReportFilters, onProgress: ProgressCallback): Promise<Sale[]> {
    const days = periodInDays(filters);
    const totalMs = this.options.baseMs + days * this.options.msPerDay;
    const failAtStep = this.random() < this.options.failureRate ? Math.ceil(this.steps / 2) : -1;
    if (this.options.log ?? true) {
      console.log(`[db] consultando vendas de ${filters.from} a ${filters.to} (${days} dias, ~${totalMs} ms)`);
    }

    for (let step = 1; step <= this.steps; step++) {
      await sleep(totalMs / this.steps);
      if (step === failAtStep) throw new Error('timeout no banco de vendas (simulado)');
      await onProgress(Math.round((step / this.steps) * 100));
    }

    return this.sales.filter((s) => s.date >= filters.from && s.date <= filters.to);
  }
}

/** Gera vendas determinísticas (mesma semente = mesmos dados em todas as réplicas). */
function generateSales(from: string, to: string, perDay: number): Sale[] {
  const random = mulberry32(42);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const sales: Sale[] = [];
  let id = 1;

  for (let day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    const count = Math.round(perDay * (0.6 + random() * 0.8));
    for (let i = 0; i < count; i++) {
      sales.push({
        id: id++,
        date,
        region: pick(REGIONS),
        category: pick(CATEGORIES),
        seller: pick(SELLERS),
        amountCents: 1_000 + Math.floor(random() * 99_000), // R$ 10,00 a R$ 1.000,00
      });
    }
  }
  return sales;
}

/** Gerador pseudoaleatório pequeno e com semente (o `Math.random` não aceita semente). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
