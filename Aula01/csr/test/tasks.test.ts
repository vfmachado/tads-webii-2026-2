import { describe, expect, it } from 'vitest';
import { formatTask } from '../src/tasks.js';

describe('formatTask', () => {
  it('marca tarefas concluídas com ✅', () => {
    expect(formatTask({ id: 1, title: 'Estudar CSR', done: true })).toBe('✅ Estudar CSR');
  });

  it('marca tarefas pendentes com ⬜', () => {
    expect(formatTask({ id: 2, title: 'Estudar SSR', done: false })).toBe('⬜ Estudar SSR');
  });
});
