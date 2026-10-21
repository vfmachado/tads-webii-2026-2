import type { Order } from '../../domain/Order.js';

/** HEXAGONAL + CQRS: porta de saída do lado da ESCRITA para pedidos. */
export interface OrderRepository {
  save(order: Order): Promise<void>;
}
