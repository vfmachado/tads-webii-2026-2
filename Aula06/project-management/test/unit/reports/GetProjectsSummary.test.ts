import { describe, expect, it } from 'vitest';
import { GetProjectsSummary } from '../../../src/modules/reports/application/useCases/GetProjectsSummary.js';
import type { ProjectRepository } from '../../../src/modules/projects/application/ports/ProjectRepository.js';
import { Project } from '../../../src/modules/projects/domain/Project.js';

class FakeProjectRepository implements ProjectRepository {
  constructor(private readonly projects: Project[]) {}
  nextId(): number {
    return this.projects.length + 1;
  }
  save(): void {}
  findById(): Project | undefined {
    return undefined;
  }
  findAll(): Project[] {
    return this.projects;
  }
}

describe('GetProjectsSummary', () => {
  it('agrupa projetos pela etapa atual', () => {
    const p3 = Project.create(3, 'C', ['Backlog', 'Feito']).advance();
    const projects = [Project.create(1, 'A', ['Backlog', 'Feito']), Project.create(2, 'B', ['Backlog']), p3];
    const useCase = new GetProjectsSummary(new FakeProjectRepository(projects));

    expect(useCase.execute()).toEqual({ totalProjects: 3, byStage: { Backlog: 2, Feito: 1 } });
  });

  it('devolve zero quando não há projetos', () => {
    const useCase = new GetProjectsSummary(new FakeProjectRepository([]));
    expect(useCase.execute()).toEqual({ totalProjects: 0, byStage: {} });
  });
});
