import { defineConfig } from 'vitest/config';

/**
 * Mesma meta das Aulas 02/03/06: 100% de cobertura no código do
 * servidor. `src/index.ts` fica de fora por ser só o bootstrap
 * (`httpServer.listen`); `src/client/main.ts` fica de fora porque roda no
 * NAVEGADOR (usa `document`, `WebSocket` do browser) — não faz sentido
 * testá-lo com Vitest no Node. O comportamento do cliente é validado à
 * mão, abrindo `npm run dev` no navegador (ver README, seção "Testando à
 * mão").
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/client/**'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
