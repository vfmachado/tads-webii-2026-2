import { describe, expect, it, vi } from 'vitest';
import { TaskController } from '../../src/controllers/TaskController.js';
import { Task } from '../../src/domain/Task.js';
import type { TaskRepository } from '../../src/repositories/TaskRepository.js';

/**
 * TESTES UNITÁRIOS do Controller: o repositório é um DUBLÊ (dublê de teste,
 * criado com `vi.fn()`), não a implementação real. Isso isola o
 * comportamento do Controller — que código HTTP ele decide devolver, em
 * que ordem ele chama o repositório — de qualquer detalhe de persistência.
 * A colaboração real Controller + Repository fica para os testes de
 * integração (test/integration/routes.test.ts).
 */
function createRepositoryDouble(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    save: vi.fn(),
    findAll: vi.fn(() => []),
    findById: vi.fn(() => undefined),
    existsPendingWithTitle: vi.fn(() => false),
    delete: vi.fn(),
    ...overrides,
  };
}

describe('TaskController#create', () => {
  it('salva e retorna 201 quando o título é válido e não há duplicata', () => {
    const repository = createRepositoryDouble();
    const controller = new TaskController(repository);

    const result = controller.create({ title: 'Nova tarefa' });

    expect(result.status).toBe(201);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('retorna 400 e NÃO chama save() quando o título é inválido', () => {
    const repository = createRepositoryDouble();
    const controller = new TaskController(repository);

    const result = controller.create({ title: 'ab' });

    expect(result.status).toBe(400);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('retorna 409 quando já existe tarefa pendente com o mesmo título', () => {
    const repository = createRepositoryDouble({ existsPendingWithTitle: vi.fn(() => true) });
    const controller = new TaskController(repository);

    const result = controller.create({ title: 'Tarefa repetida' });

    expect(result.status).toBe(409);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('TaskController#getById', () => {
  it('retorna 404 quando o repositório não encontra a tarefa', () => {
    const repository = createRepositoryDouble({ findById: vi.fn(() => undefined) });
    const controller = new TaskController(repository);

    const result = controller.getById('id-inexistente');

    expect(result.status).toBe(404);
  });

  it('retorna 200 com a tarefa quando ela existe', () => {
    const task = Task.create('Tarefa existente');
    const repository = createRepositoryDouble({ findById: vi.fn(() => task) });
    const controller = new TaskController(repository);

    const result = controller.getById(task.id);

    expect(result.status).toBe(200);
    expect((result.body as { title: string }).title).toBe('Tarefa existente');
  });
});

describe('TaskController#remove', () => {
  it('retorna 409 e não chama delete() para tarefa concluída', () => {
    const task = Task.create('Tarefa a concluir');
    task.complete();
    const repository = createRepositoryDouble({ findById: vi.fn(() => task) });
    const controller = new TaskController(repository);

    const result = controller.remove(task.id);

    expect(result.status).toBe(409);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('retorna 204 e chama delete() para tarefa pendente', () => {
    const task = Task.create('Tarefa pendente');
    const repository = createRepositoryDouble({ findById: vi.fn(() => task) });
    const controller = new TaskController(repository);

    const result = controller.remove(task.id);

    expect(result.status).toBe(204);
    expect(repository.delete).toHaveBeenCalledWith(task.id);
  });
});
