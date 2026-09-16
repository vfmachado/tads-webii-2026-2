import type { ProjectRepository } from '../ports/ProjectRepository.js';
import { Project } from '../../domain/Project.js';
import { ProjectNotFoundError } from '../../domain/errors.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). Busca o agregado via porta
 * de saída, delega a regra de transição para a entidade (`Project#advance`
 * decide se pode avançar), e salva o resultado. A decisão "pode avançar?"
 * nunca aparece aqui — mora só em `Project`, para não ficar duplicada se
 * um segundo caso de uso precisar avançar etapas de outro jeito no futuro.
 */
export class AdvanceProjectStage {
  constructor(private readonly projectRepository: ProjectRepository) {}

  execute(projectId: number): Project {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const advanced = project.advance();
    this.projectRepository.save(advanced);
    return advanced;
  }
}
