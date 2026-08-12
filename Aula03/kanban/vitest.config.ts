import { defineConfig } from 'vitest/config';

/**
 * Meta da Aula 03: a turma deve manter 100% de cobertura (linhas, funções,
 * branches e statements) em TODO código novo que escrever. O estado inicial
 * do template já bate 100% — se `npm run test:coverage` falhar depois de
 * vocês implementarem uma atividade, é sinal de que falta teste (não de que
 * a meta está errada).
 *
 * `src/index.ts` fica de fora: é só o bootstrap que sobe o servidor
 * (`app.listen`), sem lógica própria — testar isso exigiria abrir uma porta
 * de rede de verdade, o que não agrega cobertura de comportamento.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
