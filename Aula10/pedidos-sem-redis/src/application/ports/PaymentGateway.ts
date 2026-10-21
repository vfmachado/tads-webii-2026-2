/**
 * HEXAGONAL: porta de saída para o meio de pagamento. Na vida real seria
 * uma chamada HTTP para um serviço externo — lenta e fora do nosso controle.
 */
export interface PaymentGateway {
  charge(amountCents: number, description: string): Promise<void>;
}
