import type { SalesReport } from '../domain/SalesReport.js';

/** Formata o relatório como CSV (valores em reais, com ponto decimal). */
export function toCsv(report: SalesReport): string {
  const header = 'mes,regiao,categoria,quantidade_vendas,total_reais,ticket_medio_reais';
  const lines = report.lines.map((l) =>
    [l.month, l.region, l.category, l.salesCount, reais(l.totalCents), reais(l.averageTicketCents)].join(','),
  );
  const total = ['TOTAL', '', '', report.totals.salesCount, reais(report.totals.totalCents), ''].join(',');
  return [header, ...lines, total].join('\n') + '\n';
}

function reais(cents: number): string {
  return (cents / 100).toFixed(2);
}
