import type { Task } from './tasks.js';
import { formatTask } from './tasks.js';

/**
 * Código que roda no navegador (compilado com esbuild para public/main.js).
 * Busca os dados via fetch e só então monta a interface — por isso o HTML
 * inicial (veja public/index.html) não contém a lista de tarefas.
 */
async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  root.textContent = 'Carregando tarefas...';

  const response = await fetch('/api/tasks');
  const tasks: Task[] = await response.json();

  const list = document.createElement('ul');
  list.id = 'tasks';

  for (const task of tasks) {
    const item = document.createElement('li');
    item.className = task.done ? 'done' : '';
    item.textContent = formatTask(task);
    list.appendChild(item);
  }

  root.replaceChildren(list);
}

main();
