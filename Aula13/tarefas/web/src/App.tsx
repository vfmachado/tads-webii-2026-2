import { useEffect, useState, type FormEvent } from 'react';
import { api, type Task } from './api';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<string | null>(null);
  // Qual réplica (pod) da API respondeu. Recarregue a página e veja mudar.
  const [instance, setInstance] = useState<string | null>(null);

  // Executa uma ação e recarrega a lista; qualquer erro vira mensagem na tela.
  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    try {
      setError(null);
      await action();
      setTasks(await api.list());
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  useEffect(() => {
    run(async () => undefined).finally(() => setLoading(false));
    api
      .version()
      .then((v) => {
        setVersion(v.version);
        setInstance(v.instance ?? null);
      })
      .catch(() => undefined);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (await run(() => api.create(title))) setTitle('');
  };

  const pending = tasks.filter((t) => !t.done).length;

  return (
    <main>
      <h1>Tarefas</h1>

      <form onSubmit={onSubmit}>
        <input
          aria-label="Nova tarefa"
          placeholder="O que precisa ser feito?"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Adicionar</button>
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {loading ? (
        <p>Carregando...</p>
      ) : tasks.length === 0 ? (
        <p className="muted">Nenhuma tarefa ainda.</p>
      ) : (
        <ul>
          {tasks.map((t) => (
            <li key={t.id} className={t.done ? 'done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => run(() => api.setDone(t.id, e.target.checked))}
                />
                <span>{t.title}</span>
              </label>
              <button className="link" aria-label={`Remover ${t.title}`} onClick={() => run(() => api.remove(t.id))}>
                remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer>
        <span>{pending} pendente(s)</span>
        {version && <span>versão {version}</span>}
        {instance && <span>atendido por {instance}</span>}
      </footer>
    </main>
  );
}
