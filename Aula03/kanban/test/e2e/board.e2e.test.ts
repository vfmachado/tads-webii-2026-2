import { describe, expect, it, test } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';

/**
 * Único fluxo ponta a ponta que faz sentido no estado inicial do template:
 * abrir o quadro e ver os dados hard-coded (`src/seed.ts`). Usa
 * `createServer()` SEM injetar repositórios — ou seja, o quadro e os
 * cartões reais que qualquer pessoa vê ao rodar `npm run dev`.
 */
describe('Estado inicial: visualização do quadro hard-coded', () => {
  it('GET / mostra o quadro, as três colunas e os cartões semeados', async () => {
    const app = createServer();

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Quadro do Projeto');
    expect(response.text).toContain('A Fazer');
    expect(response.text).toContain('Em Andamento');
    expect(response.text).toContain('Concluído');
    expect(response.text).toContain('Criar cartão (Atividade 1)');
  });

  it('a coluna "Em Andamento" mostra o limite de WIP (1/3) e não está estourada', async () => {
    const app = createServer();

    const response = await request(app).get('/');

    expect(response.text).toContain('1/3');
  });

  it('cartões de prioridade alta, média e baixa aparecem com rótulos diferentes', async () => {
    const app = createServer();

    const response = await request(app).get('/');

    expect(response.text).toContain('alta');
    expect(response.text).toContain('média');
    expect(response.text).toContain('baixa');
  });
});

describe('Jornada completa (a implementar conforme as atividades avançam)', () => {
  test.todo(
    'criar cartão → mover para "Em Andamento" → editar → mover para "Concluído" → excluir, tudo via HTTP',
  );
});
