import type { OrderQueries, OrderSummary } from '../ports/OrderQueries.js';

/** HEXAGONAL + CQRS: QUERY. Lista os pedidos já gravados. */
export class ListOrders {
  constructor(private readonly queries: OrderQueries) {}

  execute(): Promise<OrderSummary[]> {
    return this.queries.list();
  }
}
