import { Order } from '../../domain/Order.js';
import { ProductNotFoundError } from '../../domain/errors.js';
import type { Lock } from '../ports/Lock.js';
import type { OrderRepository } from '../ports/OrderRepository.js';
import type { PaymentGateway } from '../ports/PaymentGateway.js';
import type { ProductRepository } from '../ports/ProductRepository.js';

export interface PlaceOrderInput {
  productId: string;
  quantity: number;
}

export interface PlaceOrderOutput {
  orderId: string;
  productId: string;
  quantity: number;
  totalCents: number;
  remainingStock: number;
}

/**
 * HEXAGONAL + CQRS: COMMAND. Os mesmos 5 passos da versão sem Redis:
 *
 *   1. ler o produto do banco
 *   2. reservar o estoque (regra do domínio)
 *   3. cobrar no meio de pagamento
 *   4. gravar o novo estoque
 *   5. gravar o pedido
 *
 * A diferença é que agora os passos rodam DENTRO de um lock com a chave
 * `lock:product:<id>`. Enquanto um pedido da camiseta está entre o passo 1
 * e o passo 5, os outros pedidos da camiseta esperam. Quando chega a vez
 * deles, o passo 1 já lê o estoque atualizado.
 *
 * A chave é POR PRODUTO: pedidos da caneca não esperam pelos da camiseta.
 *
 * O caso de uso depende da porta `Lock`, não do Redis: quem escolhe o
 * `RedisLock` é o composition root (`app.ts`).
 */
export class PlaceOrder {
  constructor(
    private readonly products: ProductRepository,
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
    private readonly lock: Lock,
  ) {}

  execute(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    return this.lock.withLock(`lock:product:${input.productId}`, () => this.place(input));
  }

  private async place(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    product.reserve(input.quantity);
    const order = Order.place(product, input.quantity);

    await this.payments.charge(order.totalCents, `${input.quantity}x ${product.name}`);
    await this.products.save(product);
    await this.orders.save(order);

    return {
      orderId: order.id,
      productId: product.id,
      quantity: order.quantity,
      totalCents: order.totalCents,
      remainingStock: product.stock,
    };
  }
}
