import { randomUUID } from 'node:crypto';
import type { Product } from './Product.js';

/** HEXAGONAL: domínio. Um pedido registra o que foi vendido e por quanto. */
export class Order {
  private constructor(
    readonly id: string,
    readonly productId: string,
    readonly quantity: number,
    readonly totalCents: number,
    readonly createdAt: Date,
  ) {}

  static place(product: Product, quantity: number): Order {
    return new Order(randomUUID(), product.id, quantity, product.priceCents * quantity, new Date());
  }
}
