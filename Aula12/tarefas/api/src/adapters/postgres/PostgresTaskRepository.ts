import type { Pool } from 'pg';
import type { TaskRepository } from '../../application/ports/TaskRepository.js';
import type { Task } from '../../domain/Task.js';

interface TaskRow {
  id: number;
  title: string;
  done: boolean;
  created_at: Date;
  done_at: Date | null;
}

const toTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  done: r.done,
  createdAt: r.created_at,
  doneAt: r.done_at,
});

const COLUMNS = 'id, title, done, created_at, done_at';

export class PostgresTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Task[]> {
    const { rows } = await this.pool.query<TaskRow>(`SELECT ${COLUMNS} FROM tasks ORDER BY id DESC`);
    return rows.map(toTask);
  }

  async add(title: string): Promise<Task> {
    const { rows } = await this.pool.query<TaskRow>(
      `INSERT INTO tasks (title) VALUES ($1) RETURNING ${COLUMNS}`,
      [title],
    );
    return toTask(rows[0]!);
  }

  async setDone(id: number, done: boolean): Promise<Task | null> {
    const { rows } = await this.pool.query<TaskRow>(
      `UPDATE tasks SET done = $2::boolean, done_at = CASE WHEN $2::boolean THEN now() ELSE NULL END
        WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, done],
    );
    return rows[0] ? toTask(rows[0]) : null;
  }

  async remove(id: number): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}
