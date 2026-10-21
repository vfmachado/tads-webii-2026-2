import type { OrderRepository } from '../../application/ports/OrderRepository.js';
import type { Order } from '../../domain/Order.js';
import type { SlowDatabase } from './SlowDatabase.js';

/** HEXAGONAL + CQRS: adaptador da ESCRITA para pedidos. */
export class InMemoryOrderRepository implements OrderRepository {
  constructor(private readonly db: SlowDatabase) {}

  async save(order: Order): Promise<void> {
    await this.db.insertOrder({
      id: order.id,
      productId: order.productId,
      quantity: order.quantity,
      totalCents: order.totalCents,
      createdAt: order.createdAt.toISOString(),
    });
  }
}
