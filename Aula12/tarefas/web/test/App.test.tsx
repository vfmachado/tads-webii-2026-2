import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest'; // describe/it/expect vêm dos globais (vitest/globals)
import { App } from '../src/App';
import type { Task } from '../src/api';

// TESTE DE COMPONENTE: o `fetch` é trocado por uma API falsa em memória.
// Não precisa de navegador, servidor nem banco.
function fakeApi() {
  let tasks: Task[] = [];
  let next = 1;
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const json = (body: unknown, status = 200) =>
      new Response(status === 204 ? null : JSON.stringify(body), { status });

    if (url === '/api/version') return json({ version: 'teste' });
    if (url === '/api/tasks' && method === 'GET') return json(tasks);
    if (url === '/api/tasks' && method === 'POST') {
      const { title } = JSON.parse(init!.body as string);
      if (title.trim().toLowerCase() === 'erro') return json({ error: 'Título inválido' }, 400);
      const t: Task = { id: next++, title, done: false, createdAt: '', doneAt: null };
      tasks = [t, ...tasks];
      return json(t, 201);
    }
    const id = Number(url.split('/').pop());
    if (method === 'PATCH') {
      const { done } = JSON.parse(init!.body as string);
      tasks = tasks.map((t) => (t.id === id ? { ...t, done } : t));
      return json(tasks.find((t) => t.id === id));
    }
    if (method === 'DELETE') {
      tasks = tasks.filter((t) => t.id !== id);
      return json(null, 204);
    }
    return json({ error: 'não previsto no teste' }, 500);
  });
}

describe('App', () => {
  beforeEach(() => vi.stubGlobal('fetch', fakeApi()));
  afterEach(() => vi.unstubAllGlobals());

  it('mostra o estado vazio e a versão publicada', async () => {
    render(<App />);
    expect(await screen.findByText('Nenhuma tarefa ainda.')).toBeTruthy();
    expect(await screen.findByText('versão teste')).toBeTruthy();
  });

  it('fluxo principal: adicionar, concluir e remover', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Nenhuma tarefa ainda.');

    await user.type(screen.getByLabelText('Nova tarefa'), 'publicar o site');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('publicar o site')).toBeTruthy();
    expect(screen.getByText('1 pendente(s)')).toBeTruthy();

    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(screen.getByText('0 pendente(s)')).toBeTruthy());

    await user.click(screen.getByRole('button', { name: /Remover/ }));
    expect(await screen.findByText('Nenhuma tarefa ainda.')).toBeTruthy();
  });

  it('mostra o erro devolvido pela API e mantém o texto digitado', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Nenhuma tarefa ainda.');
    await user.type(screen.getByLabelText('Nova tarefa'), 'erro');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Título inválido');
    expect((screen.getByLabelText('Nova tarefa') as HTMLInputElement).value).toBe('erro');
  });
});
