import { describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from '../../src/repositories/TaskRepository.js';
import { Task } from '../../src/domain/Task.js';

/**
 * TESTE DE INTEGRAÇÃO: nenhum dublê aqui — `Task` (Model) e
 * `InMemoryTaskRepository` reais, colaborando de verdade. Verifica que a
 * combinação das duas peças funciona, não apenas cada uma isolada.
 */
describe('InMemoryTaskRepository', () => {
  it('persiste e recupera uma tarefa por id', () => {
    const repository = new InMemoryTaskRepository();
    const task = Task.create('Tarefa integrada');

    repository.save(task);
    const found = repository.findById(task.id);

    expect(found?.title).toBe('Tarefa integrada');
  });

  it('lista todas as tarefas salvas', () => {
    const repository = new InMemoryTaskRepository();
    repository.save(Task.create('Primeira'));
    repository.save(Task.create('Segunda'));

    expect(repository.findAll()).toHaveLength(2);
  });

  it('detecta título duplicado apenas entre tarefas pendentes', () => {
    const repository = new InMemoryTaskRepository();
    const task = Task.create('Tarefa concluída');
    repository.save(task);
    task.complete();
    repository.save(task);

    // A única tarefa com este título já está concluída, então não conta como duplicata.
    expect(repository.existsPendingWithTitle('Tarefa concluída')).toBe(false);
  });

  it('remove uma tarefa pelo id', () => {
    const repository = new InMemoryTaskRepository();
    const task = Task.create('Tarefa a remover');
    repository.save(task);

    repository.delete(task.id);

    expect(repository.findById(task.id)).toBeUndefined();
  });
});
