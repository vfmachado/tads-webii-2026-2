import type { Card } from './Card.js';

/**
 * MODEL (persistência) — "banco em memória" dos cartões. Diferente do
 * Controller (que ainda não faz nada além de lançar `NotImplementedError`),
 * este repositório já está pronto e testado: criar, mover, editar e
 * excluir cartões são regras de ORQUESTRAÇÃO/USO que vocês vão implementar
 * no `CardController`, chamando os métodos que já existem aqui.
 */
export interface CardRepository {
  save(card: Card): void;
  findAll(): Card[];
  findById(id: string): Card | undefined;
  findByColumn(columnId: string): Card[];
  existsWithTitleInColumn(title: string, columnId: string, excludeId?: string): boolean;
  delete(id: string): void;
}

export class InMemoryCardRepository implements CardRepository {
  private readonly cards = new Map<string, Card>();

  save(card: Card): void {
    this.cards.set(card.id, card);
  }

  findAll(): Card[] {
    return Array.from(this.cards.values());
  }

  findById(id: string): Card | undefined {
    return this.cards.get(id);
  }

  findByColumn(columnId: string): Card[] {
    return this.findAll().filter((card) => card.columnId === columnId);
  }

  existsWithTitleInColumn(title: string, columnId: string, excludeId?: string): boolean {
    const normalized = title.trim().toLowerCase();
    return this.findAll().some(
      (card) =>
        card.id !== excludeId && card.columnId === columnId && card.title.toLowerCase() === normalized,
    );
  }

  delete(id: string): void {
    this.cards.delete(id);
  }
}
