import type { ProjectRepository } from '../ports/ProjectRepository.js';
import type { Project } from '../../domain/Project.js';

/**
 * HEXAGONAL: caso de uso (camada de aplicação). Sem regra de negócio
 * nenhuma — delega direto à porta de saída. Existe mesmo assim para
 * manter a mesma forma de acesso dos outros casos de uso (o Controller
 * nunca importa um adaptador de saída diretamente).
 */
export class ListProjects {
  constructor(private readonly projectRepository: ProjectRepository) {}

  execute(): Project[] {
    return this.projectRepository.findAll();
  }
}
