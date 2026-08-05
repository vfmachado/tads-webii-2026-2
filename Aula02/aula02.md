# Aula 02 — Padrão arquitetural MVC (Model-View-Controller)

## Objetivo

Reconhecer o padrão Model-View-Controller como resposta a um problema concreto — código onde regra de negócio, acesso a dados e formatação de resposta HTTP estão todos misturados no mesmo lugar — e aplicá-lo para separar essas três responsabilidades em um projeto Node/TypeScript real. Ao final da aula, o estudante deve saber apontar, em qualquer trecho de código, "isso é Model, View ou Controller?" e explicar por que essa separação muda diretamente a testabilidade do sistema.

## Conteúdos

### 1. O problema antes do padrão

Antes de nomear o padrão, nomear a dor: um handler de rota que faz parsing de `req.body`, valida regra de negócio, mexe direto na "persistência" (um array, um `Map`, uma tabela) e monta a resposta — tudo na mesma função. Sintomas típicos:

* A mesma validação copiada e colada em mais de um lugar (criar e editar, por exemplo).
* Regra de negócio que só pode ser testada subindo um servidor HTTP inteiro.
* Qualquer mudança de banco de dados ou de formato de resposta arrisca quebrar regra de negócio, porque estão no mesmo arquivo.

Isso não é um exagero didático — é o estado natural de qualquer código que cresce sem uma convenção de onde cada tipo de responsabilidade deve morar.

### 2. Model, View, Controller: o que cada um faz (e o que cada um NÃO faz)

* **Model** — o estado e as regras do domínio. Sabe o que é um dado válido, o que pode e não pode acontecer com ele (invariantes), e como ele é persistido. **Não sabe** que existe HTTP, JSON ou Express.
* **View** — a representação de saída. Pega o que o Model produz e formata para quem vai consumir (JSON, HTML, XML — o formato é detalhe). **Não decide** regra de negócio nem código de status HTTP.
* **Controller** — a orquestração. Recebe a entrada (nesse caso, uma requisição HTTP já traduzida), aciona o Model, escolhe o que a View deve renderizar e qual código de status responder. **Não deveria** conter regra de negócio de domínio — só decisões de fluxo/orquestração.

O erro mais comum ao adotar MVC não é esquecer o Model ou a View — é o **Controller inchado** (*Fat Controller*): sem disciplina, toda regra de negócio nova "cabe" no controller porque é o lugar mais fácil de colocar código. MVC não impede isso sozinho; exige a disciplina de perguntar, a cada linha nova, "isso é orquestração ou é regra do domínio?".

### 3. A View na prática: um motor de templates (EJS)

Falar de "View" em abstrato é fácil; a parte prática desta aula usa **EJS** (Embedded JavaScript templates) para tornar a View concreta: um arquivo `.ejs` mistura HTML com JavaScript entre `<% %>` para gerar a página que o navegador recebe — o mesmo princípio do SSR da Aula 01, agora dentro de uma estrutura MVC.

Os dois projetos rodam EJS, mas de formas opostas — e essa diferença é o ponto da aula:

* **`antes/src/views/tasks.ejs`** — o template filtra tarefas pendentes/concluídas, formata datas e monta rótulos de status sozinho, porque não existe nenhuma camada anterior que prepare esses dados. É "View" só de nome: na prática, também faz o trabalho que seria do Model/Controller.
* **`depois/src/views/tasks.ejs`** — o template só recebe uma lista de objetos já prontos para exibição (`{ title, statusLabel, createdAtLabel }`) e itera. Quem monta esse "view model" é `depois/src/views/taskView.ts` (`toTaskListViewModel`), chamado pela rota — não pelo Controller (que continua sem saber que existe HTML) nem pelo template (que continua sem saber o que significa `status === 'done'`).

Abram `GET /` nos dois projetos lado a lado: o HTML final é equivalente, mas os templates são radicalmente diferentes. Essa é a prova de que a View também sofre (ou se beneficia) da separação MVC, não só o Model.

### 4. MVC no backend web x MVC "clássico" x MVVM/Flux no frontend

MVC nasceu no Smalltalk (Trygve Reenskaug, 1979) para interfaces desktop, onde View e Controller respondiam a eventos de UI em tempo real. O "MVC" que frameworks web (Rails, Django, Spring MVC, e o que construímos nesta aula com Express + EJS) implementam é uma variação: sem loop de eventos de UI, com uma requisição HTTP entrando e uma resposta saindo — por isso alguns autores chamam de *MVC adaptado para a Web* ou simplesmente *Model 2*. Vale marcar essa diferença para não confundir com MVVM (Angular, versões antigas) ou Flux/Redux (React), que resolvem um problema diferente: sincronizar estado de UI no cliente, não estruturar um backend.

### 5. Onde entram os atributos de qualidade

Mesmo trocando o tema formal desta aula, dois atributos de qualidade do vocabulário da disciplina aparecem de forma muito concreta ao comparar `antes/` e `depois/`:

* **Testabilidade** — no projeto `antes/`, a única forma de verificar "título precisa ter entre 3 e 120 caracteres" é subir o Express e fazer uma requisição HTTP (teste de integração ou e2e). No `depois/`, a mesma regra é testável isoladamente, em microssegundos, sem rede nem framework (teste unitário). A causa raiz é 100% arquitetural: a regra deixou de estar presa a um `req`/`res`.

* **Modificabilidade** — no `antes/`, mudar a regra de duplicidade de título exige editar dois handlers (`POST` e `PUT`) e confiar que ambos foram lembrados. No `depois/`, a regra de formato vive só em `Task.validateTitle`; muda em um lugar, vale para os dois fluxos.


### 6. Onde o MVC começa a doer (gancho para próximos conteúdos)

MVC resolve a separação entre negócio, dados e apresentação, mas **não resolve** a separação entre negócio e infraestrutura. Reparem no `TaskController` do projeto `depois/`: ele decide "tarefa concluída não pode ser excluída" — uma regra de negócio — dentro do Controller, porque não existe uma camada de "casos de uso" para colocá-la. Em sistemas maiores, esse tipo de regra se multiplica dentro dos controllers até eles ficarem tão difíceis de testar quanto o `antes/` original. É exatamente esse limite que a Aula 04 (arquitetura em camadas, hexagonal, Clean Architecture, Ports and Adapters) vai endereçar, introduzindo uma camada de aplicação/casos de uso entre o Controller e o Model.

## Material desta pasta

Dois projetos independentes em TypeScript, implementando a **mesma API HTTP de tarefas** (criar, listar, buscar, renomear, concluir, excluir) — um antes de aplicar MVC, outro depois:

```
Aula02/
├── antes/    → CRUD inteiro dentro dos handlers de rota (sem Model/View/Controller)
└── depois/   → o mesmo CRUD reorganizado em Model, View e Controller
```

Ambos usam Express + TypeScript + Vitest + Supertest + **EJS** (o motor de templates que implementa a View), seguindo a mesma stack da Aula 01.

### Rodando o exemplo "antes"

```bash
cd antes
npm install
npm test        # testes de integração + e2e (não há testes unitários — ver o porquê no README da pasta)
npm run dev      # sobe o servidor em http://localhost:3000
```

Abra `http://localhost:3000` no navegador para ver a página HTML renderizada por `views/tasks.ejs` (a View com lógica embutida) — os endpoints JSON continuam em `/tasks`.

### Rodando o exemplo "depois"

```bash
cd depois
npm install
npm test                  # suíte completa: unit + integration + e2e
npm run test:unit          # só as regras de negócio isoladas
npm run dev                 # sobe o servidor em http://localhost:3001
```

Abra `http://localhost:3001` para ver a mesma página, agora renderizada a partir de um "view model" pronto (`views/taskView.ts`) por um template `.ejs` sem lógica nenhuma.

Cada pasta tem seu próprio `README.md` detalhando estrutura, decisões e a tabela de endpoints.

## Testes: os três níveis, aplicados de propósito

O projeto `depois/` foi estruturado para tornar a diferença entre os três níveis tangível, não apenas nominal:

| Nível | Onde | O que verifica | Dependências reais ou substituídas? |
| --- | --- | --- | --- |
| **Unitário** | `depois/test/unit/Task.test.ts` | Regras do Model isoladas (título válido, não concluir 2x, não renomear concluída) | Nenhuma dependência externa — só a classe `Task` |
| **Unitário** | `depois/test/unit/TaskController.test.ts` | Decisões do Controller (que status HTTP, em que ordem chama o repositório) | Repositório **substituído** por um dublê (`vi.fn()`) |
| **Integração** | `depois/test/integration/TaskRepository.test.ts` | Colaboração real entre `Task` (Model) e `InMemoryTaskRepository` | Reais — nenhum dublê |
| **Integração** | `depois/test/integration/routes.test.ts` | A fiação completa rota → controller → repositório → view, endpoint por endpoint | Reais, via Supertest |
| **Integração** | `depois/test/integration/view.integration.test.ts` | Rota `GET /` → View (`toTaskListViewModel`) → template `.ejs`, resultado em HTML | Reais, via Supertest |
| **E2E** | `depois/test/e2e/taskLifecycle.e2e.test.ts` | Uma jornada de usuário completa encadeada (criar → renomear → concluir → tentar violar regra → excluir) | Reais, simulando um cliente HTTP do início ao fim |

O projeto `antes/` só tem testes de integração e e2e — de propósito. Não existe forma de escrever um teste unitário de "a regra do título" porque a regra não existe como uma unidade isolável; ela só existe dentro do handler HTTP. Essa ausência é ela mesma um artefato didático: comparem `antes/test/` com `depois/test/unit/` e reparem que o segundo simplesmente **não tem como existir** no primeiro sem antes refatorar.

## Atividade em sala

1. Rodar `npm test` nos dois projetos e comparar quantos arquivos de teste cada um tem — e por quê.
2. Abrir `antes/src/server.ts` e circular manualmente (ou anotar) três blocos de código: onde é Model, onde é View, onde é Controller. Perceber que a resposta é "não dá para separar sem mexer no código".
3. Abrir `depois/src/controllers/TaskController.ts` e encontrar a única regra de negócio que **ainda** está no Controller (a de não excluir tarefa concluída). Discutir: essa regra deveria estar em outro lugar? Onde?
4. Comparar os arquivos de teste unitários do projeto `depois/` com os do projeto `antes/` e observar como a refatoração permitiu testar regras de negócio isoladas.

## Discussão 

Guardem a pergunta que provavelmente sobrou: "o Controller decide uma regra de negócio (`remove()`, no `TaskController`) — isso está certo?". Não há resposta definitiva em MVC puro; é exatamente a tensão que motiva a Aula 03 (modularidade e fronteiras) e a Aula 04 (arquitetura em camadas/hexagonal), quando uma camada de casos de uso passa a existir entre Controller e Model.
