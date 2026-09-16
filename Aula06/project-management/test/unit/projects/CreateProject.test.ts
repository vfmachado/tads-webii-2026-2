import { describe, expect, it } from 'vitest';
import { CreateProject } from '../../../src/modules/projects/application/useCases/CreateProject.js';
import type { ProjectRepository } from '../../../src/modules/projects/application/ports/ProjectRepository.js';
import type { Project } from '../../../src/modules/projects/domain/Project.js';

/**
 * Fake mínimo da porta `ProjectRepository` — não é `InMemoryProjectRepository`
 * de propósito. O ponto desta aula é que o caso de uso só depende da
 * INTERFACE; qualquer implementação (até uma tão simples quanto esta)
 * serve para testá-lo isoladamente, sem tocar em Express nem no adaptador
 * "de verdade".
 */
class FakeProjectRepository implements ProjectRepository {
  public saved: Project[] = [];
  private id = 0;

  nextId(): number {
    this.id += 1;
    return this.id;
  }

  save(project: Project): void {
    this.saved.push(project);
  }

  findById(): Project | undefined {
    return undefined;
  }

  findAll(): Project[] {
    return this.saved;
  }
}

describe('CreateProject', () => {
  it('pede um novo id ao repositório e salva o projeto criado', () => {
    const repository = new FakeProjectRepository();
    const useCase = new CreateProject(repository);

    const project = useCase.execute('Projeto', ['Backlog', 'Feito']);

    expect(project.id).toBe(1);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]).toBe(project);
  });
});
