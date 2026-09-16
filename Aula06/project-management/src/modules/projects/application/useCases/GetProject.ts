import type { ProjectRepository } from '../ports/ProjectRepository.js';
import type { Project } from '../../domain/Project.js';
import { ProjectNotFoundError } from '../../domain/errors.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). O caso de uso mais simples
 * possível — só existe para que o Controller HTTP não fale diretamente com
 * a porta de saída (`ProjectRepository`). Mesmo uma leitura passa pela
 * camada de aplicação, para manter uma única forma de acessar o domínio.
 */
export class GetProject {
  constructor(private readonly projectRepository: ProjectRepository) {}

  execute(projectId: number): Project {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return project;
  }
}
