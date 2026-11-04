/**
 * HEXAGONAL: domínio. A CÓPIA do worker dos filtros do relatório.
 *
 * É a mesma lista de `relatorios-api/src/domain/ReportFilters.ts`. Os dois
 * serviços são projetos separados (cada um com o seu `package.json`, a sua
 * imagem Docker e o seu ciclo de deploy), então não importam código um do
 * outro: eles combinam um CONTRATO (`adapters/kafka/events.ts`).
 */
export const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const;
export const CATEGORIES = ['Eletrônicos', 'Livros', 'Moda', 'Casa', 'Esportes'] as const;

export type Region = (typeof REGIONS)[number];
export type Category = (typeof CATEGORIES)[number];

export interface ReportFilters {
  from: string;
  to: string;
  region?: Region;
  category?: Category;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function periodInDays(filters: Pick<ReportFilters, 'from' | 'to'>): number {
  return Math.round((Date.parse(filters.to) - Date.parse(filters.from)) / DAY_MS) + 1;
}
