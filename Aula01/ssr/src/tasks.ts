export interface Task {
  id: number;
  title: string;
  done: boolean;
}

export const tasks: Task[] = [
  { id: 1, title: 'Configurar ambiente Node.js + TypeScript', done: true },
  { id: 2, title: 'Entender a diferença entre SSR e CSR', done: false },
  { id: 3, title: 'Escrever o primeiro teste automatizado', done: false },
];

/**
 * Monta o HTML da lista de tarefas.
 *
 * Função pura de propósito: não depende do Express nem de rede,
 * então pode ser testada isoladamente (veja test/tasks.test.ts).
 */
export function renderTasksHtml(items: Task[]): string {
  const rows = items
    .map((task) => `  <li class="${task.done ? 'done' : ''}">${task.done ? '✅' : '⬜'} ${task.title}</li>`)
    .join('\n');

  return `<ul id="tasks">\n${rows}\n</ul>`;
}
