import { InvalidTaskTitleError } from './errors.js';

export interface Task {
  id: number;
  title: string;
  done: boolean;
  createdAt: Date;
  /** Preenchido quando a tarefa é concluída (migration 002). */
  doneAt: Date | null;
}

export const MAX_TITLE_LENGTH = 120;

/** Regra de negócio: título sem espaços sobrando, de 1 a 120 caracteres. */
export function normalizeTitle(raw: string): string {
  const title = raw.trim().replace(/\s+/g, ' ');
  if (title.length === 0) throw new InvalidTaskTitleError('O título não pode ser vazio');
  if (title.length > MAX_TITLE_LENGTH) {
    throw new InvalidTaskTitleError(`O título pode ter no máximo ${MAX_TITLE_LENGTH} caracteres`);
  }
  return title;
}
