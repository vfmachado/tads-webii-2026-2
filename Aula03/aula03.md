# Aula 03 — Modularidade e gerenciamento de dependências (atividade prática)

## Objetivo

Projetar e implementar funcionalidades novas dentro de fronteiras de módulo já definidas, entendendo na prática o que significa alta coesão, baixo acoplamento e a diferença entre dependência técnica e dependência de negócio. Ao final da aula, cada grupo deve ter implementado pelo menos uma atividade completa (Model + Controller + testes) sem violar a organização por módulo (`boards/` x `cards/`) do template.

**Como isso se conecta com o planejamento da disciplina:** o objetivo continua sendo o da Aula 03 em [`../aulas.md`](../aulas.md) — modularidade e gerenciamento de dependências. A diferença é a prática: em vez de refatorar um projeto que já nasceu emaranhado (camadas técnicas → features, como o enunciado original sugere), a turma parte de um projeto **já organizado por features** ([`kanban/`](kanban/)) e implementa funcionalidades novas dentro dele — o que obriga a mesma reflexão (onde essa funcionalidade mora? quem ela pode depender?), só que olhando para a frente em vez de corrigir o passado.

## Conteúdos

* Alta coesão, baixo acoplamento — e por que isso não é só teoria: o `kanban/` já expõe um acoplamento real para vocês discutirem (ver seção "Acoplamento cards ↔ boards" abaixo).
* Acoplamento aferente x eferente: quem depende de quem, e o que isso custa quando algo precisa mudar.
* Dependências técnicas (Express, EJS) x dependências de negócio (regra de WIP limit, título duplicado) — e por que o Model não deveria conhecer as primeiras.
* Princípio da inversão de dependência: por que `CardController`/`BoardController` dependem das *interfaces* `CardRepository`/`BoardRepository`, não da implementação em memória.
* Package by layer x package by feature: o `kanban/` já está organizado por feature (`boards/`, `cards/`) — comparem com a Aula 02 (`domain/`, `controllers/`, `views/`), que era por camada.
* Fronteiras de módulo e o custo de mudá-las depois: cada atividade proposta pede para vocês respeitarem a fronteira já traçada — e questionarem quando ela não faz sentido.

## Material desta pasta

Um único projeto, [`kanban/`](kanban/), pronto para a turma clonar/copiar e implementar em cima. Stack: Express + TypeScript + EJS + Tailwind (via CDN) + banco em memória, testado com Vitest + Supertest, seguindo as mesmas convenções das Aulas 01 e 02.

```bash
cd kanban
npm install
npm test               # 100% dos testes passam no estado inicial
npm run test:coverage   # 100% de cobertura no estado inicial
npm run dev              # http://localhost:3002
```

Abram `http://localhost:3002`: é um quadro Kanban com três colunas ("A Fazer", "Em Andamento", "Concluído") e cartões — só que **nenhum botão funciona ainda**. Isso é esperado: ler o quadro (`GET /`) é o único caso de uso implementado. Detalhes completos de estrutura em [`kanban/README.md`](kanban/README.md).

### Os cartões do quadro SÃO a lista de atividades

Reparem: os títulos dos cartões hard-coded em `src/seed.ts` (ex.: "Criar cartão (Atividade 1)", "Mover cartão entre colunas (Atividade 2)") correspondem exatamente às atividades propostas abaixo. O quadro que vocês abrem no navegador é o próprio backlog desta aula — implementar as atividades é, literalmente, fazer esse quadro funcionar para gerenciar a si mesmo.

## Acoplamento cards ↔ boards (discussão antes de começar a codar)

Antes de implementar qualquer atividade, abram `src/boards/BoardController.ts` e `src/cards/CardController.ts` e reparem:

* `BoardController` recebe um `CardRepository` no construtor (precisa dele para desenhar os cartões dentro de cada coluna em `showBoard()`).
* `CardController` recebe um `BoardRepository` no construtor (vai precisar dele para validar se uma coluna existe antes de criar/mover um cartão).

Ou seja: **os dois módulos dependem um do outro.** Isso é um acoplamento aferente e eferente ao mesmo tempo, exatamente o tipo de situação que a Aula 03 pede para vocês reconhecerem. Perguntas para responder em grupo (não precisa resolver, só registrar a resposta num comentário/ADR curto):

1. Esse acoplamento é um problema real ou aceitável para o tamanho atual do projeto?
2. Se `cards` precisasse virar um serviço separado no futuro (Aula 08 vai tratar disso), o que quebraria primeiro?
3. Uma alternativa seria o `Board` "possuir" a lista de ids de cartões (em vez de `CardController` perguntar ao `BoardRepository`) — o que isso resolveria, e o que isso criaria de novo?

## Atividades propostas

Cada atividade indica os arquivos principais a mexer e o critério de aceite. Implementem na ordem 1 → 4 antes de partir para as demais — elas dependem umas das outras (não dá para mover um cartão que não pode ser criado).

### Atividade 1 — Criar cartão (`POST /cards`)
**Arquivos:** `src/cards/CardController.ts` (`create`), possivelmente `src/cards/errors.ts`.
**Critério de aceite:**
- Corpo `{ title, columnId, priority?, description? }`; usa `Card.create` (já valida título/prioridade/coluna estruturalmente).
- Retorna 404 se `columnId` não existe no quadro (`boardRepository.getDefault().hasColumn(...)`).
- Salva com `cardRepository.save(...)` e redireciona (ou renderiza) de volta para `/`.
- Testes: substituam o `test.todo` de criação em `cards.routes.test.ts` por um teste real; removam o teste "responde 501" para `POST /cards`.

### Atividade 2 — Mover cartão entre colunas (`POST /cards/:id/move`)
**Arquivos:** `src/cards/Card.ts` (`changeColumn`), `src/cards/CardController.ts` (`move`).
**Critério de aceite:**
- 404 se o cartão não existe; 404 se a coluna destino não existe.
- `Card#changeColumn` deixa de lançar `NotImplementedError` e efetivamente troca `columnId`.
- (Podem aplicar o limite de WIP aqui mesmo, ou deixar para a Atividade 5 — decisão do grupo, documentem qual escolheram.)

### Atividade 3 — Editar cartão (`POST /cards/:id/update`)
**Arquivos:** `src/cards/Card.ts` (`rename`, `changePriority`), `src/cards/CardController.ts` (`update`).
**Critério de aceite:**
- Aceita título, descrição e/ou prioridade novos; 404 se o cartão não existe; 400 se o novo título for inválido.

### Atividade 4 — Excluir cartão (`POST /cards/:id/delete`)
**Arquivos:** `src/cards/CardController.ts` (`remove`).
**Critério de aceite:**
- 404 se o cartão não existe; `cardRepository.delete(id)` e redireciona para `/`.
- Discussão em grupo: deveria haver alguma restrição para excluir um cartão em "Concluído" (paralelo à regra da Aula 02)? Se decidirem que sim, criem o erro correspondente e registrem em `shared/errorHandler.ts`.

### Atividade 5 — Aplicar limite de WIP na coluna "Em Andamento"
**Arquivos:** `src/cards/CardController.ts` (`move`, e possivelmente `create`), novo erro `WipLimitExceededError` em `src/cards/errors.ts`.
**Critério de aceite:**
- Um cartão não pode entrar numa coluna cujo `wipLimit` já foi atingido (`column.wipLimit !== null && cardRepository.findByColumn(columnId).length >= column.wipLimit`).
- Resposta 409 quando a regra é violada.
- A View (`boardView.ts`) já calcula `isOverWipLimit` e o template já destaca a coluna em vermelho quando isso acontece — vocês só precisam impedir que a violação aconteça no Controller.

### Atividade 6 — Impedir título duplicado na mesma coluna
**Arquivos:** `src/cards/CardController.ts` (`create`, `update`), novo erro `DuplicateCardTitleError`.
**Critério de aceite:**
- Usa `cardRepository.existsWithTitleInColumn(...)` (já implementado e testado) para checar antes de salvar.
- Resposta 409 quando duplicado. Mesmo título em colunas diferentes é permitido (igual à Aula 02).

### Atividade 7 — Criar novas colunas (`POST /columns`)
**Arquivos:** `src/boards/Board.ts` (`addColumn`), `src/boards/BoardController.ts` (`createColumn`).
**Critério de aceite:**
- `Board#addColumn` gera um id, define a próxima `order` e adiciona a coluna à lista interna.
- Nome de coluna inválido (`InvalidColumnNameError`, já existe) deve resultar em 400.
- Decisão do grupo: permitir nomes de coluna duplicados no mesmo quadro? Documentem a escolha.

### Atividade 8 (estica) — Página de detalhe do cartão (`GET /cards/:id`)
**Arquivos:** `src/cards/CardController.ts` (`showDetail`), nova view `src/views/cards/show.ejs`, `src/cards/cardView.ts` (criem este arquivo — ainda não existe).
**Critério de aceite:** 404 se o cartão não existir; página mostra título, descrição, prioridade e coluna atual.

### Atividade 9 (estica) — Busca de cartões (`GET /cards/search?query=...`)
**Arquivos:** `src/cards/CardController.ts` (`search`).
**Critério de aceite:** retorna (renderizado ou como lista) só os cartões cujo título contém o termo buscado (case-insensitive); termo vazio retorna todos.

### Atividade 10 (estica, arquitetural) — Reduzir o acoplamento cards ↔ boards
Proponham (implementação opcional) uma forma de `CardController` não depender diretamente de `BoardRepository` — por exemplo, um pequeno "port" (`ColumnExistenceChecker`) implementado por `boards/` e injetado em `cards/`, invertendo a direção da dependência. Documentem o trade-off: isso resolve o acoplamento ou só o disfarça?

### Atividade 11 (estica, maior) — Suporte a múltiplos quadros
Hoje `BoardRepository.getDefault()` assume um único quadro. Generalizar para vários quadros (`findById`, rotas com `:boardId`) é uma mudança que atravessa `boards/`, `cards/` (cartões passariam a pertencer a um quadro específico) e as views. Boa atividade para avaliar o "custo de mudar a fronteira de módulo depois" mencionado nos Conteúdos.

## Critérios de avaliação (desta prática)

* **Testes passam:** `npm test` sem falhas.
* **100% de cobertura mantida:** `npm run test:coverage` sem erro de threshold — cada atividade implementada deve vir com teste(s) cobrindo o caminho feliz e pelo menos um caminho de erro.
* **Fronteira de módulo respeitada:** código de `cards/` não deveria importar detalhes internos de `boards/` além de `BoardRepository`/`Board` (e vice-versa); nenhuma lógica de negócio de cartão deveria vazar para dentro de `boards/`, nem o inverso.
* **`test.todo` viraram `it`:** para cada atividade implementada, o `test.todo` correspondente em `cards.routes.test.ts`/`board.e2e.test.ts` deve ter virado um teste real, e o teste antigo de "responde 501" para aquela rota deve ter sido removido.
* **Registro de decisões:** onde a atividade pede uma decisão do grupo (nomes de coluna duplicados, exclusão de cartão concluído, etc.), a resposta deve estar em um comentário no código ou num parágrafo curto no README.

## Atividade em sala

1. Rodar `npm run test:coverage` no estado inicial e confirmar 100% — esse é o "chão" que não pode regredir.
2. Ler a seção "Acoplamento cards ↔ boards" acima e responder as três perguntas em grupo (10 min).
3. Implementar a Atividade 1 (criar cartão) de ponta a ponta: `Card.create` já existe, falta o Controller + rota + teste.
4. Se sobrar tempo, seguir para a Atividade 2 (mover cartão) — ela reaproveita a validação de coluna que vocês acabaram de escrever na Atividade 1.

## Discussão para aulas futuras

Guardem a pergunta: `CardController` decide a regra "coluna precisa existir" perguntando diretamente ao `BoardRepository` do outro módulo. Isso é razoável num monólito modular pequeno como este — mas é exatamente o tipo de acoplamento que se torna caro em arquiteturas maiores. Nas próximas aulas (arquitetura em camadas, hexagonal, Clean Architecture, Ports and Adapters) teremos repertório para decidir quando vale a pena isolar essa dependência atrás de uma porta, e quando isso é abstração sem benefício real.
