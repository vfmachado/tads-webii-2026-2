import { API, requestReport, waitUntilFinished, type ReportView } from './client.js';

/**
 * Teste de carga PONTA A PONTA: mede o que o usuário sente.
 *
 *   npm run carga                 # 12 relatórios de 90 dias (~2,4 s cada)
 *   npm run carga -- 30           # 30 relatórios
 *   npm run carga -- 12 7         # 12 relatórios de 7 dias (~1,1 s cada)
 *
 * Rode com 1, 3 e 5 workers e compare a tabela:
 *
 *   docker compose up -d --scale relatorios-worker=1
 *   docker compose up -d --scale relatorios-worker=3
 *   docker compose up -d --scale relatorios-worker=5   # tópico tem 3 partições...
 */
const total = Number(process.argv[2] ?? 12);
const days = Number(process.argv[3] ?? 90);

const from = new Date('2026-01-01T00:00:00Z');
const to = new Date(from.getTime() + (days - 1) * 86_400_000);
const filters = { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };

console.log(`Pedindo ${total} relatórios de ${days} dias (${filters.from} a ${filters.to}) em ${API}...\n`);

const start = performance.now();
const created = await Promise.all(
  Array.from({ length: total }, (_, i) => requestReport({ email: `carga${i}@exemplo.com`, filters })),
);
const acceptedAt = performance.now() - start;

const accepted = created.filter((c) => c.status === 202);
if (accepted.length < total) console.warn(`${total - accepted.length} pedidos NÃO foram aceitos!`);

// Mostra o progresso enquanto a fila esvazia.
let finishedCount = 0;
const progress = setInterval(() => {
  process.stdout.write(`\r  concluídos: ${finishedCount}/${accepted.length}  (${((performance.now() - start) / 1000).toFixed(1)} s)`);
}, 500);

const finished: ReportView[] = await Promise.all(
  accepted.map(async (c) => {
    const report = await waitUntilFinished(c.report.id, 10 * 60_000, 500);
    finishedCount++;
    return report;
  }),
);
clearInterval(progress);
const totalSeconds = (performance.now() - start) / 1000;
console.log('\n');

const postMs = created.map((c) => c.ms).sort((a, b) => a - b);
const waits = finished.map((r) => r.totalMs ?? 0).sort((a, b) => a - b);
const processing = finished.map((r) => r.processingMs ?? 0);
const avgProcessing = processing.reduce((a, b) => a + b, 0) / processing.length;

console.table({
  'relatórios pedidos': total,
  'aceitos (202)': accepted.length,
  'concluídos': finished.filter((r) => r.status === 'COMPLETED').length,
  'falharam': finished.filter((r) => r.status === 'FAILED').length,
  'POST /reports p50 (ms)': Math.round(percentile(postMs, 50)),
  'POST /reports p95 (ms)': Math.round(percentile(postMs, 95)),
  'todos os POSTs respondidos em (ms)': Math.round(acceptedAt),
  'processamento médio no worker (ms)': Math.round(avgProcessing),
  'espera total p50 (s)': +(percentile(waits, 50) / 1000).toFixed(1),
  'espera total máx (s)': +(waits.at(-1)! / 1000).toFixed(1),
  'tempo até o último ficar pronto (s)': +totalSeconds.toFixed(1),
  'vazão (relatórios/min)': Math.round((finished.length / totalSeconds) * 60),
});

const byWorker = Object.groupBy(finished, (r) => r.processedBy ?? '?');
console.log('Relatórios por réplica do worker:');
console.table(Object.fromEntries(Object.entries(byWorker).map(([worker, list]) => [worker, list!.length])));
console.log(
  `Se fosse um worker só, seriam ~${((avgProcessing * total) / 1000).toFixed(0)} s. ` +
    `Paralelismo efetivo: ${((avgProcessing * total) / 1000 / totalSeconds).toFixed(1)}x.`,
);

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}
