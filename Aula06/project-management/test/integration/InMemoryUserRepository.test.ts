import { describe, expect, it } from 'vitest';
import { InMemoryUserRepository } from '../../src/modules/access/adapters/memory/InMemoryUserRepository.js';

describe('InMemoryUserRepository', () => {
  it('encontra um usuário semeado por id', () => {
    const repository = new InMemoryUserRepository([{ id: 1, name: 'Ana', role: 'ADMIN' }]);
    expect(repository.findById(1)?.name).toBe('Ana');
  });

  it('retorna undefined para um id não semeado', () => {
    const repository = new InMemoryUserRepository();
    expect(repository.findById(1)).toBeUndefined();
  });
});
