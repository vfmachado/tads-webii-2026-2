import type { OrderQueries, OrderSummary } from '../../application/ports/OrderQueries.js';
import type { SlowDatabase } from './SlowDatabase.js';

/** HEXAGONAL + CQRS: adaptador da LEITURA para pedidos. */
export class InMemoryOrderQueries implements OrderQueries {
  constructor(private readonly db: SlowDatabase) {}

  list(): Promise<OrderSummary[]> {
    return this.db.selectAllOrders();
  }
}
