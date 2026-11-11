import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InvalidTaskTitleError } from '../../src/domain/errors.js';
import { MAX_TITLE_LENGTH, normalizeTitle } from '../../src/domain/Task.js';

// TESTE UNITÁRIO: lógica pura, sem banco, sem HTTP, milissegundos.
describe('normalizeTitle', () => {
  it('remove espaços nas pontas e colapsa os do meio', () => {
    assert.equal(normalizeTitle('  comprar   pão \n'), 'comprar pão');
  });

  it('rejeita título vazio ou só com espaços', () => {
    assert.throws(() => normalizeTitle(''), InvalidTaskTitleError);
    assert.throws(() => normalizeTitle('   '), InvalidTaskTitleError);
  });

  it('aceita exatamente o limite e rejeita um a mais', () => {
    assert.equal(normalizeTitle('a'.repeat(MAX_TITLE_LENGTH)).length, MAX_TITLE_LENGTH);
    assert.throws(() => normalizeTitle('a'.repeat(MAX_TITLE_LENGTH + 1)), InvalidTaskTitleError);
  });
});
