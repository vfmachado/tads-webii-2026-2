import { describe, expect, it } from 'vitest';
import { InMemoryProjectRepository } from '../../src/modules/projects/adapters/memory/InMemoryProjectRepository.js';
import { Project } from '../../src/modules/projects/domain/Project.js';

describe('InMemoryProjectRepository', () => {
  it('gera ids incrementais', () => {
    const repository = new InMemoryProjectRepository();
    expect(repository.nextId()).toBe(1);
    expect(repository.nextId()).toBe(2);
  });

  it('salva e recupera um projeto por id', () => {
    const repository = new InMemoryProjectRepository();
    const project = Project.create(repository.nextId(), 'Projeto', ['Backlog']);

    repository.save(project);

    expect(repository.findById(project.id)?.name).toBe('Projeto');
  });

  it('retorna undefined para um id inexistente', () => {
    const repository = new InMemoryProjectRepository();
    expect(repository.findById(999)).toBeUndefined();
  });

  it('lista todos os projetos salvos', () => {
    const repository = new InMemoryProjectRepository();
    repository.save(Project.create(repository.nextId(), 'A', ['Backlog']));
    repository.save(Project.create(repository.nextId(), 'B', ['Backlog']));

    expect(repository.findAll()).toHaveLength(2);
  });
});
