import type { Project } from '../../domain/Project.js';
import type { ProjectRepository } from '../../application/ports/ProjectRepository.js';

/**
 * HEXAGONAL: adaptador secundário (driven/out adapter). Guarda projetos
 * numa `Map` e gera ids incrementais. `Project` é imutável (`advance()`
 * devolve uma instância nova em vez de mutar `this`), então guardar a
 * referência aqui é seguro — não existe o risco clássico de "quem chamou
 * `findById` conseguir alterar o estado interno do repositório por fora".
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<number, Project>();
  private lastId = 0;

  nextId(): number {
    this.lastId += 1;
    return this.lastId;
  }

  save(project: Project): void {
    this.projects.set(project.id, project);
  }

  findById(id: number): Project | undefined {
    return this.projects.get(id);
  }

  findAll(): Project[] {
    return [...this.projects.values()];
  }
}
