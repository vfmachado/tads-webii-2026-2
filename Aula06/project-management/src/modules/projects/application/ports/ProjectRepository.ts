import type { Project } from '../../domain/Project.js';

/**
 * HEXAGONAL: porta de saída (secondary/driven port). `nextId` existe aqui
 * (e não no domínio) porque gerar um identificador é uma decisão de
 * persistência — um banco real usaria auto-incremento ou UUID; a
 * aplicação só precisa de ALGUM id novo, sem saber como ele é gerado.
 * `reports` (outro módulo) depende desta MESMA interface para ler
 * projetos — reuso de porta entre módulos, não duplicação.
 */
export interface ProjectRepository {
  nextId(): number;
  save(project: Project): void;
  findById(id: number): Project | undefined;
  findAll(): Project[];
}
