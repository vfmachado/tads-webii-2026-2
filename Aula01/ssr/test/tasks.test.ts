import { describe, expect, it } from 'vitest';
import { renderTasksHtml, type Task } from '../src/tasks.js';

describe('renderTasksHtml', () => {
  it('renderiza cada tarefa como um item de lista', () => {
    const items: Task[] = [
      { id: 1, title: 'Estudar SSR', done: true },
      { id: 2, title: 'Estudar CSR', done: false },
    ];

    const html = renderTasksHtml(items);

    expect(html).toContain('Estudar SSR');
    expect(html).toContain('Estudar CSR');
    expect(html).toContain('✅');
    expect(html).toContain('⬜');
  });

  it('retorna uma lista vazia quando não há tarefas', () => {
    expect(renderTasksHtml([])).toBe('<ul id="tasks">\n\n</ul>');
  });
});
