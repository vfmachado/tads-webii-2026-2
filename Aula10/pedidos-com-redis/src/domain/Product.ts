import { InvalidQuantityError, OutOfStockError } from './errors.js';

/**
 * HEXAGONAL: domínio (núcleo). O produto conhece a regra do estoque:
 * não dá para reservar mais unidades do que existem.
 *
 * Repare que a regra está CERTA. O problema desta aula não é a regra,
 * é que duas requisições ao mesmo tempo podem aplicá-la sobre uma cópia
 * VELHA do estoque (veja `PlaceOrder`).
 */
export class Product {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly priceCents: number,
    private _stock: number,
  ) {}

  get stock(): number {
    return this._stock;
  }

  reserve(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError();
    }
    if (quantity > this._stock) {
      throw new OutOfStockError(this.id, quantity, this._stock);
    }
    this._stock -= quantity;
  }
}
