# Aula 02 — versão "DEPOIS" (MVC)

A mesma API de tarefas de [`../antes`](../antes) — mesmos endpoints, mesmas regras de negócio, mesmo comportamento observável — reorganizada em **Model, View e Controller**.

## Estrutura

```
src/
├── domain/
│   ├── Task.ts            → MODEL: entidade com as regras (título válido, não concluir 2x, não renomear concluída)
│   └── errors.ts           → erros de domínio (falam a língua do negócio, não de HTTP)
├── repositories/
│   └── TaskRepository.ts   → MODEL (persistência): interface + implementação em memória
├── controllers/
│   └── TaskController.ts   → CONTROLLER: orquestra Model + View, decide o código HTTP
├── views/
│   ├── taskView.ts         → VIEW: formata Task/erro para JSON e monta o "view model" para HTML
│   └── tasks.ejs            → VIEW (template): só itera e imprime o que `taskView.ts` já preparou
├── routes.ts                → liga rotas Express aos métodos do Controller (nenhuma regra de negócio aqui)
├── server.ts                → monta o Express app (injeta o repositório, configura o EJS)
└── index.ts                 → sobe o servidor HTTP
```

## O que mudou em relação ao `antes/`

* A validação do título existe em **um único lugar** (`Task.validateTitle`, dentro do Model), chamada tanto na criação quanto na renomeação.
* `TaskController` não sabe o que é `req` ou `res` — recebe dados já extraídos e devolve `{ status, body }`. Quem fala Express é só `routes.ts`.
* `TaskController` depende da **interface** `TaskRepository`, não da implementação em memória — trocar por Postgres no futuro (Aula 07) não deveria exigir mudar o Controller.
* Como a lógica está isolada em classes/funções puras, agora é possível testar regra de negócio **sem** subir servidor HTTP (`test/unit/`).
* A View HTML (`GET /`) reaproveita `controller.list()` — a mesma chamada usada pela API JSON. Quem faz o template funcionar sem lógica embutida é `toTaskListViewModel` (em `taskView.ts`), que transforma `TaskSnapshot[]` num "view model" pronto para exibição (`statusLabel`, `createdAtLabel`). Compare com `antes/src/views/tasks.ejs`, onde essa formatação vive dentro do próprio `.ejs`.

## Rodando

```bash
npm install
npm test                  # roda toda a suíte (unit + integration + e2e)
npm run test:unit          # só as regras de negócio, isoladas
npm run test:integration   # Model+Repository reais e Controller+Repository+HTTP reais
npm run test:e2e           # jornada completa via HTTP
npm run dev                 # sobe o servidor em http://localhost:3001
```

## Os três níveis de teste, na prática

```
test/
├── unit/
│   ├── Task.test.ts             → só o Model. Sem Express, sem repositório, sem HTTP.
│   └── TaskController.test.ts    → só o Controller. Repositório substituído por um dublê (vi.fn()).
├── integration/
│   ├── TaskRepository.test.ts    → Model + Repository reais colaborando (sem dublês).
│   ├── routes.test.ts             → Express + Controller + Repository reais, via Supertest.
│   └── view.integration.test.ts   → rota GET / + View HTML (EJS), fiação completa.
└── e2e/
    └── taskLifecycle.e2e.test.ts  → um cliente HTTP percorre a jornada completa, do início ao fim.
```

A diferença entre `integration/routes.test.ts` e `e2e/taskLifecycle.e2e.test.ts` não é a ferramenta (as duas usam Supertest) — é o **escopo**: o de integração verifica um endpoint por vez, isolando comportamento; o e2e encadeia várias chamadas numa única história de uso, do jeito que um cliente real usaria a API.

## Endpoints

Idênticos aos de [`../antes`](../antes), incluindo o `GET /` que agora renderiza HTML via EJS — ver a tabela lá. A API pública não mudou; só a organização interna.
