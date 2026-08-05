# Aula 02 — versão "ANTES" (sem MVC)

CRUD de tarefas (criar, listar, buscar, renomear, concluir, excluir) implementado inteiramente dentro dos handlers de rota do Express, em `src/server.ts`. Não existe Model, View ou Controller — só um array em memória e seis funções de rota que fazem tudo sozinhas.

## Por que este projeto existe

Não é um exemplo de código ruim por descuido — é o ponto de partida deliberado do comparativo com [`../depois`](../depois), que implementa exatamente a mesma API reorganizada em MVC. A ideia é rodar os dois, ler os dois e sentir a diferença na pele antes de ler a teoria em [`../aula02.md`](../aula02.md).

Repare especialmente:

* A validação do título (`3 a 120 caracteres`) aparece **duplicada** em `POST /tasks` e `PUT /tasks/:id`.
* A regra "não pode excluir tarefa concluída" e "não pode concluir duas vezes" está espalhada nos handlers, misturada com código de parsing de `req.body` e formatação de `res.json()`.
* Não há nenhum arquivo em `test/unit/` — só dá para testar as regras de negócio subindo o Express inteiro e fazendo uma requisição HTTP. Isso é consequência direta de a regra estar presa dentro do handler.
* A rota `GET /` renderiza `src/views/tasks.ejs` com **EJS** — mas o próprio template filtra tarefas pendentes/concluídas e formata data/rótulo de status sozinho (veja os blocos `<% %>` dentro do `.ejs`). A "View" também sofre com a falta de MVC: sem uma camada que prepare os dados, quem faz esse trabalho é o template.

## Rodando

```bash
npm install
npm test              # roda os testes de integração + e2e
npm run dev            # sobe o servidor em http://localhost:3000
```

## Testes

```
test/
├── integration/tasks.integration.test.ts   → um endpoint por vez, via Supertest
├── integration/view.integration.test.ts     → a página HTML renderizada por EJS
└── e2e/taskLifecycle.e2e.test.ts             → jornada completa (criar → renomear → concluir → excluir) numa única execução
```

## Endpoints

| Método | Rota                  | Descrição                                    |
| ------ | --------------------- | --------------------------------------------- |
| GET    | `/`                    | Página HTML (EJS) com a lista de tarefas      |
| POST   | `/tasks`               | Cria uma tarefa (`{ "title": "..." }`)        |
| GET    | `/tasks`               | Lista todas as tarefas                        |
| GET    | `/tasks/:id`           | Busca uma tarefa por id                       |
| PUT    | `/tasks/:id`           | Renomeia uma tarefa pendente                  |
| POST   | `/tasks/:id/complete`  | Marca a tarefa como concluída                 |
| DELETE | `/tasks/:id`           | Exclui uma tarefa pendente (não concluída)    |
