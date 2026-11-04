import type { Category, Region, ReportFilters } from './ReportFilters.js';

/** Uma venda, como vem do banco de vendas. */
export interface Sale {
  id: number;
  /** AAAA-MM-DD */
  date: string;
  region: Region;
  category: Category;
  seller: string;
  amountCents: number;
}

/** Uma linha do relatório: o consolidado de um mês, numa região, numa categoria. */
export interface SalesReportLine {
  month: string;
  region: Region;
  category: Category;
  salesCount: number;
  totalCents: number;
  averageTicketCents: number;
}

export interface SalesReport {
  filters: ReportFilters;
  lines: SalesReportLine[];
  totals: { salesCount: number; totalCents: number };
}

/**
 * HEXAGONAL: domínio. A REGRA do relatório: agrupar as vendas por
 * mês × região × categoria e somar. É uma função pura: sem Kafka, sem S3,
 * sem relógio. Fácil de testar.
 */
export function consolidateSales(sales: Sale[], filters: ReportFilters): SalesReport {
  const groups = new Map<string, SalesReportLine>();
  let salesCount = 0;
  let totalCents = 0;

  for (const sale of sales) {
    if (!matches(sale, filters)) continue;
    salesCount++;
    totalCents += sale.amountCents;

    const month = sale.date.slice(0, 7);
    const key = `${month}|${sale.region}|${sale.category}`;
    const line = groups.get(key) ?? {
      month,
      region: sale.region,
      category: sale.category,
      salesCount: 0,
      totalCents: 0,
      averageTicketCents: 0,
    };
    line.salesCount++;
    line.totalCents += sale.amountCents;
    groups.set(key, line);
  }

  const lines = [...groups.values()]
    .map((line) => ({ ...line, averageTicketCents: Math.round(line.totalCents / line.salesCount) }))
    .sort((a, b) => a.month.localeCompare(b.month) || a.region.localeCompare(b.region) || a.category.localeCompare(b.category));

  return { filters, lines, totals: { salesCount, totalCents } };
}

function matches(sale: Sale, filters: ReportFilters): boolean {
  return (
    sale.date >= filters.from &&
    sale.date <= filters.to &&
    (!filters.region || sale.region === filters.region) &&
    (!filters.category || sale.category === filters.category)
  );
}
