import type { Request, Response } from 'express';
import type { CreateProject } from '../../application/useCases/CreateProject.js';
import type { AdvanceProjectStage } from '../../application/useCases/AdvanceProjectStage.js';
import type { GetProject } from '../../application/useCases/GetProject.js';
import type { ListProjects } from '../../application/useCases/ListProjects.js';
import type { Project } from '../../domain/Project.js';
import { ValidationError } from '../../../../shared/errors.js';

/**
 * HEXAGONAL: adaptador primário (driving/in adapter). Só sabe ler
 * `req.body`/`req.params` e devolver JSON — toda regra (nomes de etapa
 * únicos, projeto precisa de ao menos uma etapa, não avançar além da
 * última) vive nos casos de uso e na entidade `Project`. Trocar Express
 * por Fastify significaria reescrever só este arquivo (e
 * `projectRoutes.ts`), não os casos de uso.
 */
export class ProjectController {
  constructor(
    private readonly createProject: CreateProject,
    private readonly advanceProjectStage: AdvanceProjectStage,
    private readonly getProject: GetProject,
    private readonly listProjects: ListProjects,
  ) {}

  create(req: Request, res: Response): void {
    const { name, stages } = req.body as { name?: unknown; stages?: unknown };

    if (typeof name !== 'string') {
      throw new ValidationError('"name" é obrigatório e deve ser uma string');
    }
    if (!Array.isArray(stages) || stages.length === 0 || stages.some((s) => typeof s !== 'string')) {
      throw new ValidationError('"stages" é obrigatório e deve ser uma lista de nomes (string)');
    }

    const project = this.createProject.execute(name, stages);
    res.status(201).json(toJSON(project));
  }

  list(_req: Request, res: Response): void {
    res.json(this.listProjects.execute().map(toJSON));
  }

  get(req: Request, res: Response): void {
    const project = this.getProject.execute(Number(req.params.id));
    res.json(toJSON(project));
  }

  advance(req: Request, res: Response): void {
    const project = this.advanceProjectStage.execute(Number(req.params.id));
    res.json(toJSON(project));
  }
}

// Formato de saída HTTP do agregado, deliberadamente separado da entidade
// de domínio: uma mudança na representação HTTP (ex.: expor mais campos
// para o frontend) não deveria forçar uma mudança em `Project`.
function toJSON(project: Project) {
  return {
    id: project.id,
    name: project.name,
    stages: project.stages.map((s) => s.name),
    currentStage: project.currentStage.name,
    currentStageIndex: project.currentStageIndex,
    isAtFinalStage: project.isAtFinalStage,
  };
}
