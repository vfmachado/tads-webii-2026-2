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
 * Função pura (sem DOM, sem rede) para poder ser testada isoladamente
 * tanto no servidor quanto no bundle do navegador.
 */
export function formatTask(task: Task): string {
  return `${task.done ? '✅' : '⬜'} ${task.title}`;
}
