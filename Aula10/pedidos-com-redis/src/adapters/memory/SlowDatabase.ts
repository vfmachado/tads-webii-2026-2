import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Um "banco de dados" em memória que se comporta como um banco de verdade
 * nos dois pontos que importam para esta aula:
 *
 *   1. LATÊNCIA: toda consulta demora (rede + disco). A listagem é a mais
 *      cara, porque varre a tabela inteira.
 *   2. CÓPIAS: quem lê recebe uma CÓPIA da linha (`structuredClone`), não
 *      a linha original. Duas requisições que leem o mesmo produto ao mesmo
 *      tempo recebem duas cópias independentes — e a última a gravar vence.
 *
 * Ele também CONTA as consultas, para medirmos quanto o cache economiza.
 */
export interface DatabaseLatency {
  listMs: number;
  readMs: number;
  writeMs: number;
}

export const DEFAULT_LATENCY: DatabaseLatency = { listMs: 300, readMs: 20, writeMs: 20 };

export interface ProductRow {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
}

export interface OrderRow {
  id: string;
  productId: string;
  quantity: number;
  totalCents: number;
  createdAt: string;
}

const SEED: ProductRow[] = [
  { id: 'camiseta', name: 'Camiseta Edição Limitada', priceCents: 7990, stock: 5 },
  { id: 'caneca', name: 'Caneca IFRS', priceCents: 3500, stock: 50 },
  { id: 'adesivo', name: 'Adesivo TADS', priceCents: 500, stock: 1000 },
];

export class SlowDatabase {
  private products = new Map<string, ProductRow>();
  private orders: OrderRow[] = [];
  private queries = 0;

  constructor(
    private readonly latency: DatabaseLatency = DEFAULT_LATENCY,
    private readonly log = true,
  ) {
    this.reset();
  }

  /** Quantas consultas chegaram ao banco desde o último `reset()`. */
  get queryCount(): number {
    return this.queries;
  }

  /** Volta ao estoque inicial e apaga os pedidos (usado nos testes e na demonstração). */
  reset(): void {
    this.products = new Map(SEED.map((p) => [p.id, { ...p }]));
    this.orders = [];
    this.queries = 0;
  }

  selectAllProducts(): Promise<ProductRow[]> {
    return this.run('SELECT * FROM products ORDER BY name', this.latency.listMs, () =>
      [...this.products.values()].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  selectProduct(id: string): Promise<ProductRow | undefined> {
    return this.run(`SELECT * FROM products WHERE id = '${id}'`, this.latency.readMs, () => this.products.get(id));
  }

  updateProduct(row: ProductRow): Promise<void> {
    return this.run(`UPDATE products SET stock = ${row.stock} WHERE id = '${row.id}'`, this.latency.writeMs, () => {
      this.products.set(row.id, { ...row });
    });
  }

  insertOrder(row: OrderRow): Promise<void> {
    return this.run(`INSERT INTO orders (product_id, quantity) VALUES ('${row.productId}', ${row.quantity})`, this.latency.writeMs, () => {
      this.orders.push({ ...row });
    });
  }

  selectAllOrders(): Promise<OrderRow[]> {
    return this.run('SELECT * FROM orders ORDER BY created_at', this.latency.listMs, () => this.orders);
  }

  private async run<T>(sql: string, ms: number, operation: () => T): Promise<T> {
    this.queries++;
    if (this.log) {
      console.log(`[db #${this.queries}] ${sql}`);
    }
    await sleep(ms);
    return structuredClone(operation());
  }
}
