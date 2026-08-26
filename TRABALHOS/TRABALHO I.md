# Trabalho I

## DATA 09/09/2026

## Contexto

Este trabalho dá continuidade à atividade prática da [Aula 03](../Aula03/aula03.md), cujo tema é modularidade e gerenciamento de dependências. O ponto de partida é o projeto [`kanban/`](../Aula03/kanban/), um quadro Kanban já organizado por feature (`boards/` e `cards/`) no qual apenas a leitura do quadro (`GET /`) está implementada — nenhum botão da interface funciona ainda.

## Objetivo

Projetar e implementar funcionalidades novas dentro das fronteiras de módulo já definidas no projeto, colocando em prática os conceitos de alta coesão, baixo acoplamento e a diferença entre dependência técnica e dependência de negócio. Ao final do trabalho, o grupo deve ter implementado as atividades obrigatórias (Model + Controller + testes) sem violar a organização por módulo (`boards/` x `cards/`) do template.

## Conteúdos trabalhados

* Alta coesão, baixo acoplamento — e por que isso não é só teoria.
* Acoplamento aferente x eferente: quem depende de quem, e o que isso custa quando algo precisa mudar.
* Dependências técnicas (Express, EJS) x dependências de negócio (regra de WIP limit, título duplicado).
* Princípio da inversão de dependência: por que `CardController`/`BoardController` dependem das *interfaces* `CardRepository`/`BoardRepository`, não da implementação em memória.
* Package by layer x package by feature.
* Fronteiras de módulo e o custo de mudá-las depois.

## Preparando o ambiente

```bash
cd Aula03/kanban
npm install
npm test               # 100% dos testes passam no estado inicial
npm run test:coverage   # 100% de cobertura no estado inicial
npm run dev              # http://localhost:3002
```

Ao abrir `http://localhost:3002`, o quadro exibe três colunas ("A Fazer", "Em Andamento", "Concluído") e cartões — só que nenhum botão funciona ainda. Isso é esperado: os cartões hard-coded em `src/seed.ts` correspondem exatamente às atividades propostas abaixo. Detalhes completos da estrutura em [`kanban/README.md`](../Aula03/kanban/README.md).

## Discussão obrigatória (antes de codar)

Abram `src/boards/BoardController.ts` e `src/cards/CardController.ts` e reparem que os dois módulos dependem um do outro (`BoardController` recebe um `CardRepository`; `CardController` recebe um `BoardRepository`) — um acoplamento aferente e eferente ao mesmo tempo. Registrem, em um comentário no código ou em um parágrafo curto no README do projeto, as respostas do grupo para:

1. Esse acoplamento é um problema real ou aceitável para o tamanho atual do projeto?
2. Se `cards` precisasse virar um serviço separado no futuro, o que quebraria primeiro?
3. Uma alternativa seria o `Board` "possuir" a lista de ids de cartões (em vez de `CardController` perguntar ao `BoardRepository`) — o que isso resolveria, e o que isso criaria de novo?

## Atividades obrigatórias

Implementar, na ordem 1 → 7 (elas dependem umas das outras):

1. **Criar cartão** (`POST /cards`) — `src/cards/CardController.ts` (`create`).
2. **Mover cartão entre colunas** (`POST /cards/:id/move`) — `src/cards/Card.ts` (`changeColumn`), `src/cards/CardController.ts` (`move`).
3. **Editar cartão** (`POST /cards/:id/update`) — `src/cards/Card.ts` (`rename`, `changePriority`), `src/cards/CardController.ts` (`update`).
4. **Excluir cartão** (`POST /cards/:id/delete`) — `src/cards/CardController.ts` (`remove`).
5. **Limite de WIP** na coluna "Em Andamento" — novo erro `WipLimitExceededError`, resposta 409 quando violado.
6. **Impedir título duplicado na mesma coluna** — novo erro `DuplicateCardTitleError`, resposta 409 quando duplicado.
7. **Criar novas colunas** (`POST /columns`) — `src/boards/Board.ts` (`addColumn`), `src/boards/BoardController.ts` (`createColumn`).

Os critérios de aceite detalhados de cada atividade estão descritos na [Aula 03](../Aula03/aula03.md#atividades-propostas).

## Atividades extras (estica)

Implementação opcional, para grupos que concluírem as obrigatórias antes do prazo:

8. Página de detalhe do cartão (`GET /cards/:id`).
9. Busca de cartões (`GET /cards/search?query=...`).
10. Redução do acoplamento cards ↔ boards (inversão de dependência via um "port" `ColumnExistenceChecker`).
11. Suporte a múltiplos quadros.

## Critérios de avaliação

* **Testes passam:** `npm test` sem falhas.
* **100% de cobertura mantida:** `npm run test:coverage` sem erro de threshold — cada atividade implementada deve vir com teste(s) cobrindo o caminho feliz e pelo menos um caminho de erro.
* **Fronteira de módulo respeitada:** código de `cards/` não deve importar detalhes internos de `boards/` além de `BoardRepository`/`Board` (e vice-versa); nenhuma lógica de negócio de cartão deve vazar para dentro de `boards/`, nem o inverso.
* **`test.todo` convertidos em `it`:** para cada atividade implementada, o `test.todo` correspondente em `cards.routes.test.ts`/`board.e2e.test.ts` deve ter virado um teste real, e o teste antigo de "responde 501" para aquela rota deve ter sido removido.
* **Registro de decisões:** respostas da discussão obrigatória e decisões de grupo indicadas nos critérios de aceite (nomes de coluna duplicados, exclusão de cartão concluído, etc.) devem estar documentadas em comentário no código ou em um parágrafo curto no README.

## Entrega

Repositório (ou cópia do projeto `kanban/`) contendo a implementação das atividades obrigatórias, suíte de testes atualizada com 100% de cobertura e o registro das decisões de grupo solicitadas.
