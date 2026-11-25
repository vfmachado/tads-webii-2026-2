import { pbkdf2Sync } from 'node:crypto';
import { TaskNotFoundError } from '../domain/errors.js';
import { normalizeTitle, type Task } from '../domain/Task.js';
import type { TaskRepository } from './ports/TaskRepository.js';

export interface TaskReport {
  total: number;
  done: number;
  pending: number;
  /** Há quantos dias a tarefa pendente mais antiga está esperando. */
  oldestPendingDays: number | null;
  generatedAt: string;
  /** "Assinatura" do relatório: é aqui que a CPU é gasta (ver abaixo). */
  signature: string;
}

export interface TaskUseCaseOptions {
  /** Iterações do PBKDF2 ao assinar o relatório (REPORT_CPU_COST). */
  reportCpuCost?: number;
  now?: () => Date;
}

const DAY_MS = 86_400_000;

/** Casos de uso (portas de entrada). */
export function createTaskUseCases(repo: TaskRepository, options: TaskUseCaseOptions = {}) {
  const { reportCpuCost = 1_000, now = () => new Date() } = options;

  return {
    list: (): Promise<Task[]> => repo.list(),

    create: (title: string): Promise<Task> => repo.add(normalizeTitle(title)),

    async setDone(id: number, done: boolean): Promise<Task> {
      const task = await repo.setDone(id, done);
      if (!task) throw new TaskNotFoundError(id);
      return task;
    },

    async remove(id: number): Promise<void> {
      if (!(await repo.remove(id))) throw new TaskNotFoundError(id);
    },

    /**
     * Relatório das tarefas. A contagem é barata; a ASSINATURA é cara de
     * propósito: o PBKDF2 representa o trabalho de CPU que relatórios reais
     * fazem (gerar PDF, comprimir, assinar digitalmente, redimensionar imagem).
     *
     * `pbkdf2Sync` é SÍNCRONO: ocupa a única thread do Node enquanto roda.
     * Por isso uma instância da API usa no máximo ~1 núcleo, e a forma de
     * atender mais relatórios por segundo é ter MAIS instâncias (Aula 13).
     */
    async report(): Promise<TaskReport> {
      const tasks = await repo.list();
      const at = now();
      const pendingTasks = tasks.filter((t) => !t.done);
      const oldest = pendingTasks.reduce<Date | null>(
        (min, t) => (min === null || t.createdAt < min ? t.createdAt : min),
        null,
      );
      const summary = {
        total: tasks.length,
        done: tasks.length - pendingTasks.length,
        pending: pendingTasks.length,
        oldestPendingDays: oldest === null ? null : Math.floor((at.getTime() - oldest.getTime()) / DAY_MS),
        generatedAt: at.toISOString(),
      };
      const signature = pbkdf2Sync(JSON.stringify(summary), 'relatorio-tarefas', reportCpuCost, 32, 'sha256');
      return { ...summary, signature: signature.toString('hex') };
    },
  };
}

export type TaskUseCases = ReturnType<typeof createTaskUseCases>;
