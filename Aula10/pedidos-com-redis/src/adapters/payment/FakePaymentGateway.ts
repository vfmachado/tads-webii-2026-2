import { setTimeout as sleep } from 'node:timers/promises';
import type { PaymentGateway } from '../../application/ports/PaymentGateway.js';

/**
 * HEXAGONAL: adaptador falso do meio de pagamento. Só espera um pouco,
 * como faria uma chamada HTTP para um serviço externo. Essa espera é o que
 * deixa a "janela" da condição de corrida bem larga.
 */
export class FakePaymentGateway implements PaymentGateway {
  constructor(
    private readonly delayMs = 100,
    private readonly log = true,
  ) {}

  async charge(amountCents: number, description: string): Promise<void> {
    if (this.log) {
      console.log(`[pagamento] cobrando R$ ${(amountCents / 100).toFixed(2)} (${description})`);
    }
    await sleep(this.delayMs);
  }
}
