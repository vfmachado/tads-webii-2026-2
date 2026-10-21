/**
 * Demonstração ao vivo do ganho do cache na listagem. Com a API rodando
 * (`npm run dev` em outro terminal):
 *
 *   npm run listagem            # 20 GET /products, um depois do outro
 *   npm run listagem -- 100
 */
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3010';
const total = Number(process.argv[2] ?? 20);

await fetch(`${baseUrl}/debug/reset`, { method: 'POST' });
console.log(`Fazendo ${total} listagens de produtos contra ${baseUrl}...\n`);

const times: number[] = [];
for (let i = 0; i < total; i++) {
  const start = performance.now();
  await fetch(`${baseUrl}/products`);
  times.push(performance.now() - start);
}

const { dbQueries, cacheHits } = (await (await fetch(`${baseUrl}/debug/stats`)).json()) as {
  dbQueries: number;
  cacheHits: number;
};
const sum = times.reduce((a, b) => a + b, 0);

console.table({
  listagens: total,
  'consultas ao banco': dbQueries,
  'respostas do cache (HIT)': cacheHits,
  '1ª listagem (ms)': Math.round(times[0]),
  'média das demais (ms)': Math.round((sum - times[0]) / Math.max(total - 1, 1)),
  'tempo total (ms)': Math.round(sum),
});
