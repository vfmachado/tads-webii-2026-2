import type { ProjectRepository } from '../ports/ProjectRepository.js';
import { Project } from '../../domain/Project.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). Orquestra: pedir um id
 * novo à porta de saída, deixar a ENTIDADE validar suas próprias regras
 * (`Project.create`), e persistir. Este caso de uso não sabe se
 * `ProjectRepository` é a implementação em memória desta aula ou um
 * adaptador Prisma — só conhece a porta.
 */
export class CreateProject {
  constructor(private readonly projectRepository: ProjectRepository) {}

  execute(name: string, stageNames: string[]): Project {
    const id = this.projectRepository.nextId();
    const project = Project.create(id, name, stageNames);
    this.projectRepository.save(project);
    return project;
  }
}
