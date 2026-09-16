import { defineConfig } from 'vitest/config';

/**
 * Mesma meta das Aulas 02/03: 100% de cobertura em todo código de `src/`.
 * `src/index.ts` fica de fora porque é só o bootstrap (`app.listen`) —
 * testar isso exigiria abrir uma porta de rede de verdade, sem agregar
 * cobertura de comportamento.
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
