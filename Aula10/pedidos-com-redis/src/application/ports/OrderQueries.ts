/** HEXAGONAL + CQRS: porta de saída do lado da LEITURA para pedidos. */
export interface OrderSummary {
  id: string;
  productId: string;
  quantity: number;
  totalCents: number;
  createdAt: string;
}

export interface OrderQueries {
  list(): Promise<OrderSummary[]>;
}
