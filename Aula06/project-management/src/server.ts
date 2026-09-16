import express, { type Express } from 'express';
import { InMemoryUserRepository } from './modules/access/adapters/memory/InMemoryUserRepository.js';
import { InMemoryAccessRepository } from './modules/access/adapters/memory/InMemoryAccessRepository.js';
import { SEED_USERS, SEED_GRANTS } from './modules/access/adapters/memory/seed.js';
import { CheckModuleAccess } from './modules/access/application/useCases/CheckModuleAccess.js';
import { GrantModuleAccess } from './modules/access/application/useCases/GrantModuleAccess.js';
import { RevokeModuleAccess } from './modules/access/application/useCases/RevokeModuleAccess.js';
import { ListUserGrants } from './modules/access/application/useCases/ListUserGrants.js';
import { AccessController } from './modules/access/adapters/http/AccessController.js';
import { createAccessRoutes } from './modules/access/adapters/http/accessRoutes.js';
import { createCurrentUserMiddleware } from './modules/access/adapters/http/currentUser.js';
import { createRequireModuleAccess } from './modules/access/adapters/http/requireModuleAccess.js';
import type { UserRepository } from './modules/access/application/ports/UserRepository.js';
import type { AccessRepository } from './modules/access/application/ports/AccessRepository.js';

import { InMemoryProjectRepository } from './modules/projects/adapters/memory/InMemoryProjectRepository.js';
import { CreateProject } from './modules/projects/application/useCases/CreateProject.js';
import { AdvanceProjectStage } from './modules/projects/application/useCases/AdvanceProjectStage.js';
import { GetProject } from './modules/projects/application/useCases/GetProject.js';
import { ListProjects } from './modules/projects/application/useCases/ListProjects.js';
import { ProjectController } from './modules/projects/adapters/http/ProjectController.js';
import { createProjectRoutes } from './modules/projects/adapters/http/projectRoutes.js';
import type { ProjectRepository } from './modules/projects/application/ports/ProjectRepository.js';

import { GetProjectsSummary } from './modules/reports/application/useCases/GetProjectsSummary.js';
import { ReportsController } from './modules/reports/adapters/http/ReportsController.js';
import { createReportsRoutes } from './modules/reports/adapters/http/reportsRoutes.js';

import { errorHandler } from './shared/http/errorHandler.js';

/**
 * HEXAGONAL: a COMPOSITION ROOT — o único arquivo de toda a aplicação que
 * conhece os adaptadores concretos (`InMemory*Repository`) e monta o
 * grafo de dependências (repositório -> caso de uso -> controller ->
 * rota). Todo o resto do código (domínio, aplicação, e até os
 * Controllers) só conhece interfaces (portas). Trocar
 * `InMemoryProjectRepository` por um adaptador Postgres/Prisma significa
 * mudar código AQUI — nenhuma outra classe do sistema precisa ser tocada.
 *
 * Repare também como `requireModuleAccess` é construído uma única vez
 * (a partir do adaptador do módulo `access`) e depois passado para os
 * roteadores de `projects` e `reports`: é assim que esses dois módulos
 * ficam protegidos por autorização sem importar nada de `access`
 * diretamente — só recebem uma função pronta, no formato combinado em
 * `shared/http/RequireModuleAccess.ts`.
 */
export interface Repositories {
  userRepository: UserRepository;
  accessRepository: AccessRepository;
  projectRepository: ProjectRepository;
}

// Os parâmetros opcionais de `createServer` existem para os testes
// (integração/e2e) injetarem repositórios já preparados com dados
// conhecidos, em vez de depender do seed de demonstração abaixo.
export function createDefaultRepositories(): Repositories {
  return {
    userRepository: new InMemoryUserRepository(SEED_USERS),
    accessRepository: new InMemoryAccessRepository(SEED_GRANTS),
    projectRepository: new InMemoryProjectRepository(),
  };
}

export function createServer(repositories: Repositories = createDefaultRepositories()): Express {
  const { userRepository, accessRepository, projectRepository } = repositories;

  // --- módulo access: casos de uso + adaptadores primários HTTP ---
  const checkModuleAccess = new CheckModuleAccess(accessRepository);
  const grantModuleAccess = new GrantModuleAccess(accessRepository, userRepository);
  const revokeModuleAccess = new RevokeModuleAccess(accessRepository, userRepository);
  const listUserGrants = new ListUserGrants(accessRepository, userRepository);
  const accessController = new AccessController(grantModuleAccess, revokeModuleAccess, listUserGrants);

  const currentUser = createCurrentUserMiddleware(userRepository);
  const requireModuleAccess = createRequireModuleAccess(checkModuleAccess);

  // --- módulo projects: casos de uso + adaptador primário HTTP ---
  const createProject = new CreateProject(projectRepository);
  const advanceProjectStage = new AdvanceProjectStage(projectRepository);
  const getProject = new GetProject(projectRepository);
  const listProjects = new ListProjects(projectRepository);
  const projectController = new ProjectController(createProject, advanceProjectStage, getProject, listProjects);

  // --- módulo reports: caso de uso que reaproveita a porta de projects ---
  const getProjectsSummary = new GetProjectsSummary(projectRepository);
  const reportsController = new ReportsController(getProjectsSummary);

  const app = express();
  app.use(express.json());
  app.use(currentUser);

  app.use('/access', createAccessRoutes(accessController));
  app.use('/projects', createProjectRoutes(projectController, requireModuleAccess));
  app.use('/reports', createReportsRoutes(reportsController, requireModuleAccess));

  app.use(errorHandler);

  return app;
}
