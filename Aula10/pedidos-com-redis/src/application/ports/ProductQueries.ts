/**
 * HEXAGONAL + CQRS: porta de saída do lado da LEITURA (como a
 * `UserQueries` da Aula 09). Devolve DTOs prontos para a resposta.
 *
 * É a consulta mais chamada da API (a vitrine da loja) e, aqui, a mais
 * cara: cada chamada é uma ida ao banco.
 */
export interface ProductSummary {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
}

export interface ProductQueries {
  list(): Promise<ProductSummary[]>;
}
