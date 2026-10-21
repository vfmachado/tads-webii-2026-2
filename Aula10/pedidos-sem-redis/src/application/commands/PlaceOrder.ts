import { Order } from '../../domain/Order.js';
import { ProductNotFoundError } from '../../domain/errors.js';
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
 * HEXAGONAL + CQRS: COMMAND. Uma operação "complexa", com vários passos
 * e várias idas a sistemas externos:
 *
 *   1. ler o produto do banco
 *   2. reservar o estoque (regra do domínio)
 *   3. cobrar no meio de pagamento
 *   4. gravar o novo estoque
 *   5. gravar o pedido
 *
 * ⚠️ CONDIÇÃO DE CORRIDA: cada `await` é um ponto em que o Node atende
 * OUTRA requisição. Com 20 pedidos chegando juntos, os 20 executam o
 * passo 1 antes de qualquer um chegar ao passo 4: todos leem `stock = 5`,
 * todos passam na regra e todos gravam `stock = 4`. Resultado: 20 pedidos
 * vendidos de um produto que só tinha 5 unidades.
 *
 * A regra do domínio está certa; o que falta é garantir que, para o MESMO
 * produto, só um pedido execute os passos 1 a 5 por vez. É isso que a
 * versão com Redis (`../pedidos-com-redis`) acrescenta.
 */
export class PlaceOrder {
  constructor(
    private readonly products: ProductRepository,
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async execute(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
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
