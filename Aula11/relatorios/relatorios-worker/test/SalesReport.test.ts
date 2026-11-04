import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/application/csv.js';
import { consolidateSales, type Sale } from '../src/domain/SalesReport.js';

const sales: Sale[] = [
  { id: 1, date: '2026-01-10', region: 'Sul', category: 'Livros', seller: 'Ana', amountCents: 1000 },
  { id: 2, date: '2026-01-20', region: 'Sul', category: 'Livros', seller: 'Bruno', amountCents: 3000 },
  { id: 3, date: '2026-01-21', region: 'Sul', category: 'Moda', seller: 'Ana', amountCents: 5000 },
  { id: 4, date: '2026-02-01', region: 'Norte', category: 'Livros', seller: 'Ana', amountCents: 7000 },
  { id: 5, date: '2026-03-01', region: 'Sul', category: 'Livros', seller: 'Ana', amountCents: 9900 }, // fora do período
];

test('consolida por mês × região × categoria e calcula o ticket médio', () => {
  const report = consolidateSales(sales, { from: '2026-01-01', to: '2026-02-28' });
  assert.deepEqual(report.totals, { salesCount: 4, totalCents: 16000 });
  assert.deepEqual(report.lines, [
    { month: '2026-01', region: 'Sul', category: 'Livros', salesCount: 2, totalCents: 4000, averageTicketCents: 2000 },
    { month: '2026-01', region: 'Sul', category: 'Moda', salesCount: 1, totalCents: 5000, averageTicketCents: 5000 },
    { month: '2026-02', region: 'Norte', category: 'Livros', salesCount: 1, totalCents: 7000, averageTicketCents: 7000 },
  ]);
});

test('aplica os filtros de região e categoria', () => {
  const report = consolidateSales(sales, { from: '2026-01-01', to: '2026-12-31', region: 'Sul', category: 'Livros' });
  assert.deepEqual(report.totals, { salesCount: 3, totalCents: 13900 });
});

test('período sem vendas gera relatório vazio (e não erro)', () => {
  const report = consolidateSales(sales, { from: '2030-01-01', to: '2030-01-31' });
  assert.deepEqual(report.totals, { salesCount: 0, totalCents: 0 });
  assert.equal(report.lines.length, 0);
});

test('CSV: cabeçalho, uma linha por grupo e a linha de total', () => {
  const csv = toCsv(consolidateSales(sales, { from: '2026-01-01', to: '2026-01-31', category: 'Livros' }));
  assert.equal(
    csv,
    'mes,regiao,categoria,quantidade_vendas,total_reais,ticket_medio_reais\n' +
      '2026-01,Sul,Livros,2,40.00,20.00\n' +
      'TOTAL,,,2,40.00,\n',
  );
});
