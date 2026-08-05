import { describe, expect, it } from 'vitest';
import { Task } from '../../src/domain/Task.js';
import { InvalidTaskTitleError, TaskAlreadyCompletedError } from '../../src/domain/errors.js';

/**
 * TESTES UNITÁRIOS: testam o Model isolado — nenhum Express, nenhum HTTP,
 * nenhum repositório. Só o objeto `Task` e suas próprias regras.
 */
describe('Task.create', () => {
  it('cria uma tarefa pendente com o título normalizado (sem espaços nas pontas)', () => {
    const task = Task.create('  Estudar MVC  ');

    expect(task.title).toBe('Estudar MVC');
    expect(task.status).toBe('pending');
    expect(task.id).toBeTypeOf('string');
  });

  it('rejeita título com menos de 3 caracteres', () => {
    expect(() => Task.create('ab')).toThrow(InvalidTaskTitleError);
  });

  it('rejeita título com mais de 120 caracteres', () => {
    expect(() => Task.create('a'.repeat(121))).toThrow(InvalidTaskTitleError);
  });

  it('rejeita título que não é string', () => {
    // @ts-expect-error propositalmente passando um tipo inválido
    expect(() => Task.create(123)).toThrow(InvalidTaskTitleError);
  });
});

describe('Task#rename', () => {
  it('altera o título de uma tarefa pendente', () => {
    const task = Task.create('Título original');

    task.rename('Título atualizado');

    expect(task.title).toBe('Título atualizado');
  });

  it('não permite renomear uma tarefa já concluída', () => {
    const task = Task.create('Título original');
    task.complete();

    expect(() => task.rename('Novo título')).toThrow(TaskAlreadyCompletedError);
  });
});

describe('Task#complete', () => {
  it('muda o status para done', () => {
    const task = Task.create('Finalizar relatório');

    task.complete();

    expect(task.status).toBe('done');
  });

  it('não permite concluir a mesma tarefa duas vezes', () => {
    const task = Task.create('Finalizar relatório');
    task.complete();

    expect(() => task.complete()).toThrow(TaskAlreadyCompletedError);
  });
});
