# Aula 06 — Gerenciamento de projetos (arquitetura hexagonal)

API HTTP para gerenciar projetos organizados em **etapas configuráveis** (um workflow diferente por projeto, definido na criação), com **controle de acesso por módulo configurável em tempo de execução**: um administrador concede ou revoga o acesso de um usuário a um módulo de negócio, e a mudança já vale na **próxima requisição** desse usuário — sem logout, sem reiniciar o servidor, sem invalidar cache nenhum.

O código é organizado em **arquitetura hexagonal (Ports and Adapters)**, com **três módulos de negócio** (`access`, `projects`, `reports`) que não se conhecem por dentro. Este README foca em COMO o projeto implementa isso (tour pelo código) e como rodar/testar tudo; a teoria por trás — definição, comparação com Onion/Clean Architecture, quando vale a pena, erros comuns — está em [`../arquitetura-hexagonal.md`](../arquitetura-hexagonal.md).

## Rodando

```bash
npm install
npm test               # suíte completa (unit + integration + e2e)
npm run test:coverage   # 100% de cobertura (linhas, branches, funções, statements)
npm run dev              # http://localhost:3004
```

Ao subir com `npm run dev`, o servidor já nasce com dois usuários semeados (`src/modules/access/adapters/memory/seed.ts`):

| Usuário | `x-user-id` | Role | Concessões iniciais |
| --- | --- | --- | --- |
| Ana | `1` | `ADMIN` | `WRITE` em `projects`, `READ` em `reports` |
| Bruno | `2` | `MEMBER` | nenhuma |

Não há login de verdade nesta aula (isso é o tema da [Aula 05](../../Aula05/aula05.md)) — a "identidade" de quem faz a requisição é só o cabeçalho `x-user-id`. É uma simplificação deliberada: o foco aqui é **arquitetura** e **autorização modular**, não autenticação.

---

## O que é arquitetura hexagonal (Ports and Adapters)

A ideia central: o **domínio** (as regras de negócio) fica isolado no centro do sistema e **não conhece** nenhum detalhe técnico — nem Express, nem um banco de dados, nem HTTP. Tudo que é técnico (framework web, banco, fila, outro serviço) fica **fora**, e só se comunica com o domínio através de interfaces bem definidas: as **portas**.

```
         adaptadores primários                    adaptadores secundários
          (driving / "in")                          (driving / "out")
    ┌─────────────────────┐                    ┌─────────────────────┐
    │   HTTP (Express)     │                    │  Memória (Map)       │
    │   Controllers        │──┐            ┌──▶│  (troca por Postgres  │
    └─────────────────────┘  │            │    │   sem mudar nada além │
                              ▼            │    │   deste adaptador)    │
                     ┌──────────────────────────┐  └─────────────────────┘
                     │        PORTA (interface)   │
                     │──────────────────────────│
                     │   camada de APLICAÇÃO      │
                     │   (casos de uso)            │
                     │──────────────────────────│
                     │   DOMÍNIO (entidades,       │
                     │   regras de negócio)         │
                     └──────────────────────────┘
```

- **Domínio**: as entidades e suas regras (`Project`, `AccessGrant`). Não importa nada de fora do próprio módulo.
- **Aplicação (casos de uso)**: orquestra o domínio para realizar uma operação (`CreateProject`, `GrantModuleAccess`). Depende só de **portas** (interfaces), nunca de uma implementação concreta.
- **Portas**: interfaces que a aplicação declara e que os adaptadores implementam. Uma "porta de saída" (ex.: `ProjectRepository`) é como a aplicação pede dados para fora; o adaptador que a implementa é "secundário"/"driven" — quem *reage* a um pedido da aplicação.
- **Adaptadores primários** ("driving"/"in"): traduzem um estímulo externo (uma requisição HTTP) para uma chamada a um caso de uso. É quem *aciona* a aplicação.
- **Adaptadores secundários** ("driven"/"out"): implementam uma porta de saída com uma tecnologia concreta (aqui, estruturas em memória — `Map`). Poderiam ser Postgres, S3, outro serviço HTTP, etc.
- **Composition root**: o único lugar que conhece TODOS os adaptadores concretos e monta o grafo de dependências (aqui, `src/server.ts`).

O nome "hexagonal" vem só da forma do diagrama original (um hexágono, para caber vários lados/portas ao redor do domínio) — não há nada de mágico no número 6. O que importa é a regra de dependência: **as setas sempre apontam para dentro**. Domínio não depende de aplicação; aplicação não depende de adaptador; adaptador depende de porta (definida pela aplicação). Isso é **inversão de dependência** (o "D" do SOLID) aplicada na escala da arquitetura inteira.

### E Clean Architecture / arquitetura em camadas?

São primos da mesma ideia:

- **Arquitetura em camadas** (a mais comum) separa por responsabilidade técnica (apresentação → serviço → persistência), mas normalmente a seta de dependência aponta "para baixo" até o banco — trocar de banco tende a vazar para cima.
- **Clean Architecture** (Uncle Bob) é hexagonal com nomes e círculos concêntricos diferentes (Entities, Use Cases, Interface Adapters, Frameworks & Drivers) e a mesma regra de dependência (sempre para dentro).
- **Hexagonal/Ports and Adapters** (Cockburn) é o que este projeto usa: em vez de camadas empilhadas, portas ao redor de um núcleo — enfatiza que o *lado de fora* pode ter vários adaptadores diferentes plugados na mesma porta (HTTP hoje, uma CLI amanhã; memória hoje, Postgres amanhã).

Na prática, o que os três têm em comum — e o que vale a pena levar desta aula — é: **regra de negócio isolada de framework e de banco**, testável sem os dois. O nome da variante importa menos que a disciplina de manter a seta de dependência apontando para dentro.

---

## Tour pelo código

```
src/
├── shared/                        infraestrutura compartilhada entre módulos
│   ├── errors.ts                   erros de fronteira (validação, autenticação, autorização)
│   ├── kernel/Permission.ts         "Shared Kernel" (DDD): tipo Permission usado por todo módulo
│   └── http/
│       ├── RequireModuleAccess.ts   tipo do middleware de autorização (contrato, não implementação)
│       └── errorHandler.ts          único tradutor de erro -> status HTTP
│
├── modules/
│   ├── access/                     autenticação simplificada + autorização por módulo
│   │   ├── domain/                  User, AccessGrant, Permission (via shared/kernel), erros
│   │   ├── application/
│   │   │   ├── ports/                 UserRepository, AccessRepository (interfaces)
│   │   │   └── useCases/              CheckModuleAccess, GrantModuleAccess, RevokeModuleAccess, ListUserGrants
│   │   └── adapters/
│   │       ├── memory/                InMemoryUserRepository, InMemoryAccessRepository (implementam as portas)
│   │       └── http/                  AccessController, accessRoutes, currentUser (identidade), requireModuleAccess (autorização)
│   │
│   ├── projects/                   projetos com etapas configuráveis
│   │   ├── domain/                  Project (entidade, com as regras), Stage, erros
│   │   ├── application/
│   │   │   ├── ports/                 ProjectRepository
│   │   │   └── useCases/              CreateProject, AdvanceProjectStage, GetProject, ListProjects
│   │   └── adapters/
│   │       ├── memory/                InMemoryProjectRepository
│   │       └── http/                  ProjectController, projectRoutes
│   │
│   └── reports/                    só leitura; reaproveita a porta ProjectRepository de `projects`
│       ├── application/useCases/      GetProjectsSummary
│       └── adapters/http/             ReportsController, reportsRoutes
│
├── server.ts                       COMPOSITION ROOT: monta tudo (só arquivo que conhece os adaptadores concretos)
└── index.ts                        bootstrap (escolhe a porta, chama app.listen)
```

Cada arquivo do projeto tem, no topo, um comentário curto explicando **onde ele se encaixa** nesse desenho (domínio? porta? caso de uso? adaptador primário ou secundário?). Ao ler o código pela primeira vez, comecem por qualquer entidade de domínio (`src/modules/projects/domain/Project.ts` é um bom ponto de partida) e sigam os comentários.

### Por que `adapters/memory` e não um banco de verdade?

De propósito. As Aulas 04/05 já mostraram Prisma + Postgres/SQLite; repetir isso aqui competiria pela atenção da turma com o assunto desta aula (arquitetura). Os repositórios em memória (`InMemory*Repository`) implementam exatamente as mesmas portas que um adaptador Prisma implementaria — trocar um pelo outro é uma mudança **só em `server.ts`**, sem tocar em domínio, aplicação ou Controllers. Isso é, literalmente, o benefício que a arquitetura hexagonal promete: o desafio proposto no fim deste README (seção "Para ir além") é provar isso na prática.

---

## Os três módulos

### `access` — autenticação simplificada + autorização por módulo

- **Identidade simplificada**: o middleware `currentUser` lê o cabeçalho `x-user-id` e busca o usuário correspondente via `UserRepository`. Sem senha, sem sessão — de propósito (ver Aula 05 para autenticação real).
- **Autorização por módulo**: um `AccessGrant` é o registro de "usuário X pode fazer Y (`READ`/`WRITE`) no módulo Z". `CheckModuleAccess` consulta esse dado **a cada requisição protegida**, direto do repositório — nunca há cache. É por isso que uma concessão feita pelo admin (`POST /access/grants`) já vale na próxima chamada do usuário.
- **Quem pode conceder acesso**: só quem tem `role: 'ADMIN'` (checado dentro do caso de uso, não no Controller). Conceder/revogar acesso NÃO exige, por sua vez, um `AccessGrant` de módulo — senão nenhum admin conseguiria dar o primeiro acesso a ninguém.
- **Decisão de design deliberada**: mesmo um `ADMIN` só acessa `projects`/`reports` se tiver um `AccessGrant` — não existe bypass automático de role sobre módulo de negócio. Isso mantém o mecanismo de autorização sempre visível e testável (times reais frequentemente dão bypass a admins; é uma boa pergunta para discutir em aula — ver "Discussões" abaixo).

### `projects` — projetos com etapas configuráveis

- Cada `Project` é criado com sua **própria lista de etapas** (`stages: string[]`) — não existe um workflow único e fixo para todo o sistema. Um projeto de "Site novo" pode ter `["Descoberta", "Design", "Desenvolvimento", "Entregue"]`; outro pode ter só `["A fazer", "Feito"]`.
- `Project` é **imutável**: `advance()` devolve uma instância nova em vez de alterar o objeto atual. Isso evita um adaptador de saída guardar uma referência e vê-la mudar por baixo dos panos depois de "salva".
- Regras protegidas pela própria entidade (não pelo Controller nem pelo caso de uso): etapas não podem se repetir, precisa haver ao menos uma etapa, não dá para avançar além da última.

### `reports` — módulo pequeno, dois propósitos didáticos

1. Mostrar que a **mesma** peça de autorização (`requireModuleAccess`) funciona para um segundo módulo sem copiar lógica nenhuma — só uma nova rota chamando `requireModuleAccess('reports', 'READ')`.
2. Mostrar **reuso de porta entre módulos**: `GetProjectsSummary` depende de `ProjectRepository` (a porta declarada por `projects`), não de `InMemoryProjectRepository` nem de um Controller. Isso é reuso legítimo; seria uma violação de fronteira se `reports` importasse o adaptador concreto de `projects` diretamente (o mesmo tipo de discussão que a Aula 03 traz para `boards`/`cards`).

Acesso a `projects` e a `reports` são concessões **independentes**: ter `WRITE` em `projects` não dá nenhum acesso a `reports`, mesmo que os dados de um venham do outro por baixo.

---

## Testando o fluxo (o requisito central desta aula)

Com `npm run dev` rodando (porta 3004), em outro terminal:

```bash
# 1. Bruno (membro, sem concessão nenhuma) tenta ver os projetos -> 403
curl -s -o /dev/null -w "%{http_code}\n" -H "x-user-id: 2" http://localhost:3004/projects

# 2. Ana (admin) concede acesso de leitura a Bruno no módulo "projects"
curl -X POST http://localhost:3004/access/grants \
  -H "Content-Type: application/json" -H "x-user-id: 1" \
  -d '{"targetUserId": 2, "moduleName": "projects", "permission": "READ"}'

# 3. Bruno tenta de novo, SEM reiniciar nada, SEM logar de novo -> 200
curl -s -o /dev/null -w "%{http_code}\n" -H "x-user-id: 2" http://localhost:3004/projects
```

O passo 3 funciona porque `CheckModuleAccess` (o caso de uso por trás do middleware `requireModuleAccess`) relê o repositório de concessões em toda requisição — não existe token, sessão ou cache carregando uma foto antiga das permissões do usuário.

## Endpoints

| Método | Rota | Exige | Descrição |
| --- | --- | --- | --- |
| `POST` | `/access/grants` | `role: ADMIN` | Concede (`{ targetUserId, moduleName, permission }`) |
| `DELETE` | `/access/grants` | `role: ADMIN` | Revoga (`{ targetUserId, moduleName }`) |
| `GET` | `/access/grants/:userId` | `role: ADMIN` | Lista concessões de um usuário |
| `POST` | `/projects` | `projects:WRITE` | Cria (`{ name, stages: string[] }`) |
| `GET` | `/projects` | `projects:READ` | Lista todos |
| `GET` | `/projects/:id` | `projects:READ` | Busca um projeto |
| `POST` | `/projects/:id/advance` | `projects:WRITE` | Avança para a próxima etapa |
| `GET` | `/reports/summary` | `reports:READ` | Total de projetos e contagem por etapa atual |

Todas as rotas (exceto o próprio identificador do usuário) exigem o cabeçalho `x-user-id`. Sem ele, ou com um id que não existe, a resposta é `401`.

## Testes

```bash
npm run test:unit          # domínio + casos de uso, isolados (ports substituídas por fakes/InMemory)
npm run test:integration    # os adaptadores em memória, sozinhos
npm run test:e2e             # HTTP de ponta a ponta via supertest
npm run test:coverage        # tudo junto, com o relatório de cobertura
```

Mesma meta das Aulas 02/03: **100% de cobertura** em `src/**/*.ts` (linhas, branches, funções e statements). Reparem em `test/unit/access/CheckModuleAccess.test.ts` e `test/unit/projects/CreateProject.test.ts`: eles testam um caso de uso com um **fake da porta** escrito à mão, não com o adaptador em memória "de verdade" — é a demonstração prática de que a arquitetura hexagonal facilita teste: o caso de uso não sabe, e não se importa, que o `AccessRepository` que recebeu no teste não é o mesmo usado em produção.

---

## Simplificações deliberadas

Para manter o foco em arquitetura, este projeto deixa de lado, de propósito:

- **Autenticação real** (senha, sessão, hash) — ver [Aula 05](../../Aula05/aula05.md). Aqui, "quem está logado" é só um cabeçalho.
- **Banco de dados** — adaptadores em memória no lugar de Prisma/Postgres (ver Aulas 04/05). A porta (`ProjectRepository`, `AccessRepository`) é desenhada para que trocar isso exija mexer só em `server.ts`.
- **Bypass de ADMIN** sobre módulos de negócio — mesmo um admin precisa de um `AccessGrant` explícito para acessar `projects`/`reports`. Um sistema real frequentemente dá esse bypass; aqui ele foi omitido para manter o mecanismo de autorização sempre visível.

## Discussões para a aula

1. `GetProjectsSummary` (módulo `reports`) lê `project.currentStage.name` — ou seja, conhece um pedaço da forma da entidade `Project` de outro módulo, mesmo dependendo só de uma porta. Isso é aceitável no tamanho deste sistema, ou `projects` deveria expor um "read model" próprio para relatórios, desacoplado da entidade completa? (mesmo tipo de pergunta que a Aula 03 faz sobre `boards` e `cards`)
2. Este projeto decidiu que `ADMIN` não ganha acesso automático aos módulos de negócio. Quais os prós e contras dessa escolha frente ao bypass mais comum ("admin pode tudo")?
3. `requireModuleAccess` e `currentUser` confiam na ORDEM de composição definida em `server.ts` (identidade sempre antes de autorização) em vez de se checarem defensivamente um ao outro. Isso é uma dependência implícita perigosa, ou uma simplificação razoável dado que só existe UM composition root no projeto?
4. Hoje `AccessRepository`/`ProjectRepository` são síncronos (estruturas em memória). Um adaptador real (Postgres, uma chamada HTTP) seria assíncrono — o que muda nas portas, nos casos de uso e nos Controllers ao introduzir `Promise` em todo esse caminho?

## Para ir além (desafios)

- **Trocar o adaptador de projetos**: implementar um `PrismaProjectRepository` (reaproveitando o Prisma Client como nas Aulas 04/05) que satisfaça a porta `ProjectRepository`, e trocar só a linha em `server.ts` que hoje instancia `InMemoryProjectRepository`. Nenhum outro arquivo deveria precisar mudar.
- **Um quarto módulo**: adicionar um módulo `budget` (ex.: `GET /budget/summary`) reaproveitando `requireModuleAccess('budget', 'READ')` sem tocar em nenhum arquivo de `access`, `projects` ou `reports` — só criar o módulo novo e registrá-lo em `server.ts`.
- **Read model para `reports`**: resolver a Discussão 1 acima — criar uma porta própria (ex.: `ProjectsReadModel`) que `projects` implementa e `reports` consome, em vez de depender da entidade `Project` inteira.
