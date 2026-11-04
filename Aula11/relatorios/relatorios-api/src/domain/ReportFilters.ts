import { InvalidPeriodError } from './errors.js';

/**
 * HEXAGONAL: domínio. Os filtros que o usuário escolhe para o relatório
 * de vendas consolidado.
 *
 * Os valores possíveis de região e categoria fazem parte do CONTRATO entre
 * a API e o worker: os dois serviços precisam concordar sobre eles. Em
 * microsserviços, cada serviço tem a sua cópia (não há import entre
 * projetos); por isso a mesma lista aparece em `relatorios-worker`.
 */
export const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const;
export const CATEGORIES = ['Eletrônicos', 'Livros', 'Moda', 'Casa', 'Esportes'] as const;

export type Region = (typeof REGIONS)[number];
export type Category = (typeof CATEGORIES)[number];

export interface ReportFilters {
  /** Data inicial, inclusiva, no formato AAAA-MM-DD. */
  from: string;
  /** Data final, inclusiva, no formato AAAA-MM-DD. */
  to: string;
  region?: Region;
  category?: Category;
}

/** Período máximo de um relatório: relatórios maiores ficariam pesados demais. */
export const MAX_PERIOD_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Quantidade de dias do período, contando o primeiro e o último. */
export function periodInDays(filters: Pick<ReportFilters, 'from' | 'to'>): number {
  return Math.round((Date.parse(filters.to) - Date.parse(filters.from)) / DAY_MS) + 1;
}

/**
 * REGRA DE NEGÓCIO: o formato (data válida, região conhecida) já foi
 * validado pelo Zod no adaptador HTTP. Aqui fica o que é regra:
 * o período não pode ser invertido nem passar de um ano.
 */
export function assertValidPeriod(filters: ReportFilters): void {
  const days = periodInDays(filters);
  if (days < 1) {
    throw new InvalidPeriodError('A data inicial deve ser anterior ou igual à data final');
  }
  if (days > MAX_PERIOD_DAYS) {
    throw new InvalidPeriodError(`O período não pode passar de ${MAX_PERIOD_DAYS} dias (pedido: ${days})`);
  }
}
