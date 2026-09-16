import { describe, expect, it } from 'vitest';
import { Project } from '../../../src/modules/projects/domain/Project.js';
import {
  DuplicateStageNameError,
  EmptyStageListError,
  InvalidProjectNameError,
  ProjectAlreadyAtFinalStageError,
} from '../../../src/modules/projects/domain/errors.js';

describe('Project.create', () => {
  it('começa na primeira etapa informada', () => {
    const project = Project.create(1, 'Projeto', ['Backlog', 'Em andamento', 'Concluído']);

    expect(project.currentStage.name).toBe('Backlog');
    expect(project.currentStageIndex).toBe(0);
    expect(project.isAtFinalStage).toBe(false);
  });

  it('rejeita nome vazio', () => {
    expect(() => Project.create(1, '   ', ['Backlog'])).toThrow(InvalidProjectNameError);
  });

  it('rejeita lista de etapas vazia', () => {
    expect(() => Project.create(1, 'Projeto', [])).toThrow(EmptyStageListError);
  });

  it('rejeita etapas com nome repetido', () => {
    expect(() => Project.create(1, 'Projeto', ['Backlog', 'Backlog'])).toThrow(DuplicateStageNameError);
  });
});

describe('Project#advance', () => {
  it('move para a próxima etapa sem alterar o projeto original (imutabilidade)', () => {
    const project = Project.create(1, 'Projeto', ['Backlog', 'Em andamento']);

    const advanced = project.advance();

    expect(project.currentStage.name).toBe('Backlog');
    expect(advanced.currentStage.name).toBe('Em andamento');
    expect(advanced.isAtFinalStage).toBe(true);
  });

  it('lança erro ao tentar avançar além da última etapa', () => {
    const project = Project.create(1, 'Projeto', ['Única']);

    expect(() => project.advance()).toThrow(ProjectAlreadyAtFinalStageError);
  });
});
