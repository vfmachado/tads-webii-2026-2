import { describe, expect, it } from 'vitest';
import { Card } from '../../../src/cards/Card.js';
import { InMemoryCardRepository } from '../../../src/cards/CardRepository.js';

describe('InMemoryCardRepository', () => {
  it('persiste e recupera um cartão por id', () => {
    const repository = new InMemoryCardRepository();
    const card = Card.create('Cartão de teste', 'col-todo');

    repository.save(card);

    expect(repository.findById(card.id)?.title).toBe('Cartão de teste');
  });

  it('lista todos os cartões salvos', () => {
    const repository = new InMemoryCardRepository();
    repository.save(Card.create('Primeiro', 'col-todo'));
    repository.save(Card.create('Segundo', 'col-doing'));

    expect(repository.findAll()).toHaveLength(2);
  });

  it('filtra cartões por coluna', () => {
    const repository = new InMemoryCardRepository();
    repository.save(Card.create('No A Fazer', 'col-todo'));
    repository.save(Card.create('Em Andamento', 'col-doing'));

    expect(repository.findByColumn('col-todo')).toHaveLength(1);
    expect(repository.findByColumn('col-todo')[0].title).toBe('No A Fazer');
  });

  it('detecta título duplicado na mesma coluna, ignorando maiúsculas/minúsculas', () => {
    const repository = new InMemoryCardRepository();
    repository.save(Card.create('Cartão Repetido', 'col-todo'));

    expect(repository.existsWithTitleInColumn('cartão repetido', 'col-todo')).toBe(true);
  });

  it('não considera duplicata um título igual em outra coluna', () => {
    const repository = new InMemoryCardRepository();
    repository.save(Card.create('Mesmo título', 'col-todo'));

    expect(repository.existsWithTitleInColumn('Mesmo título', 'col-doing')).toBe(false);
  });

  it('ignora o próprio cartão ao checar duplicidade (excludeId)', () => {
    const repository = new InMemoryCardRepository();
    const card = Card.create('Editando este', 'col-todo');
    repository.save(card);

    expect(repository.existsWithTitleInColumn('Editando este', 'col-todo', card.id)).toBe(false);
  });

  it('remove um cartão pelo id', () => {
    const repository = new InMemoryCardRepository();
    const card = Card.create('Para remover', 'col-todo');
    repository.save(card);

    repository.delete(card.id);

    expect(repository.findById(card.id)).toBeUndefined();
  });
});
