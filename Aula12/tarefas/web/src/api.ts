export interface Task {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  doneAt: string | null;
}

/**
 * O front chama SEMPRE o mesmo caminho relativo (`/api`). Quem decide para
 * onde ele vai é o nginx (produção) ou o proxy do Vite (desenvolvimento).
 * Resultado: o MESMO build estático serve em qualquer ambiente; não existe
 * URL de API "embutida" no JavaScript, nem CORS para configurar.
 */
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  list: () => request<Task[]>('/tasks'),
  create: (title: string) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
  setDone: (id: number, done: boolean) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  remove: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  version: () => request<{ version: string }>('/version'),
};
