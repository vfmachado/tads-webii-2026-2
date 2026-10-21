/**
 * Demonstração ao vivo da condição de corrida. Com a API rodando
 * (`npm run dev` em outro terminal):
 *
 *   npm run ataque              # 20 pedidos simultâneos da camiseta (estoque 5)
 *   npm run ataque -- 50        # 50 pedidos
 *
 * Olhe também o terminal da API: agora cada pedido aparece inteiro entre
 * um "[lock] adquirido" e um "[lock] liberado", um depois do outro.
 */
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3010';
const total = Number(process.argv[2] ?? 20);
const productId = 'camiseta';

await fetch(`${baseUrl}/debug/reset`, { method: 'POST' });
console.log(`Disparando ${total} pedidos de "${productId}" ao mesmo tempo contra ${baseUrl}...\n`);

const start = performance.now();
const responses = await Promise.all(
  Array.from({ length: total }, () =>
    fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    }),
  ),
);
const elapsedMs = Math.round(performance.now() - start);

const byStatus = Object.groupBy(responses, (r) => String(r.status));
const products = (await (await fetch(`${baseUrl}/products`)).json()) as { id: string; stock: number }[];
const orders = (await (await fetch(`${baseUrl}/orders`)).json()) as { productId: string }[];

console.table({
  'estoque inicial': 5,
  'pedidos aceitos (201)': byStatus['201']?.length ?? 0,
  'pedidos recusados (409)': byStatus['409']?.length ?? 0,
  'outros status': responses.length - (byStatus['201']?.length ?? 0) - (byStatus['409']?.length ?? 0),
  'pedidos gravados no banco': orders.filter((o) => o.productId === productId).length,
  'estoque final no banco': products.find((p) => p.id === productId)?.stock,
  'tempo total (ms)': elapsedMs,
});
