import type { Stage } from './Stage.js';
import {
  DuplicateStageNameError,
  EmptyStageListError,
  InvalidProjectNameError,
  ProjectAlreadyAtFinalStageError,
} from './errors.js';

/**
 * HEXAGONAL: domínio (núcleo) — a entidade central desta aula. Não importa
 * nada de `express`, `application/` ou `adapters/`: só conhece suas
 * próprias regras (etapas não podem se repetir, precisa haver ao menos
 * uma, não dá para avançar além da última). Isso é o que permite testar
 * `Project` isoladamente, sem HTTP nem repositório (ver
 * `test/unit/projects/Project.test.ts`).
 *
 * É imutável de propósito: `advance()` devolve uma instância NOVA em vez
 * de alterar `this`. Isso evita o bug clássico de um adaptador de saída
 * guardar uma referência ao objeto e vê-la mudar por baixo dos panos
 * depois que já foi "salva".
 */
export class Project {
  private constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly stages: readonly Stage[],
    public readonly currentStageIndex: number,
  ) {}

  static create(id: number, name: string, stageNames: string[]): Project {
    if (name.trim().length === 0) {
      throw new InvalidProjectNameError();
    }
    if (stageNames.length === 0) {
      throw new EmptyStageListError();
    }

    const seen = new Set<string>();
    for (const stageName of stageNames) {
      if (seen.has(stageName)) {
        throw new DuplicateStageNameError(stageName);
      }
      seen.add(stageName);
    }

    const stages = stageNames.map((stageName) => ({ name: stageName }));
    return new Project(id, name, stages, 0);
  }

  get currentStage(): Stage {
    return this.stages[this.currentStageIndex];
  }

  get isAtFinalStage(): boolean {
    return this.currentStageIndex === this.stages.length - 1;
  }

  advance(): Project {
    if (this.isAtFinalStage) {
      throw new ProjectAlreadyAtFinalStageError(this.id);
    }
    return new Project(this.id, this.name, this.stages, this.currentStageIndex + 1);
  }
}
