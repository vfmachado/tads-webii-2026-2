import type { ProjectRepository } from '../../../projects/application/ports/ProjectRepository.js';

export interface ProjectsSummary {
  totalProjects: number;
  byStage: Record<string, number>;
}

/**
 * HEXAGONAL: caso de uso (camada de aplicação) do módulo `reports`. Note
 * a importação: ele depende da PORTA `ProjectRepository`, definida no
 * módulo `projects` — não de um Controller, nem do adaptador em memória
 * concreto. Isso é reuso legítimo entre módulos (a porta é uma interface
 * estável); o que seria uma violação de fronteira é `reports` importar
 * `InMemoryProjectRepository` diretamente.
 *
 * Discussão em aula: este caso de uso ainda lê `project.currentStage`
 * (API pública da entidade `Project`) — ou seja, `reports` conhece um
 * pedaço da FORMA do agregado de `projects`, mesmo sem tocar em
 * persistência. Uma alternativa mais estrita seria `projects` expor um
 * "read model"/DTO próprio para relatórios, em vez da entidade completa.
 * Vale a pena, no tamanho deste sistema? (mesmo tipo de pergunta feito
 * sobre `boards`/`cards` na Aula 03 — ver README, seção "Discussões".)
 */
export class GetProjectsSummary {
  constructor(private readonly projectRepository: ProjectRepository) {}

  execute(): ProjectsSummary {
    const projects = this.projectRepository.findAll();
    const byStage: Record<string, number> = {};

    for (const project of projects) {
      const stageName = project.currentStage.name;
      byStage[stageName] = (byStage[stageName] ?? 0) + 1;
    }

    return { totalProjects: projects.length, byStage };
  }
}
