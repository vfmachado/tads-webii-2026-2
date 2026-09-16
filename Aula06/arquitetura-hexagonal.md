# Arquitetura hexagonal (Ports and Adapters)

Material de conceito da Aula 06. O tour pelo código específico do projeto desta aula está em [`project-management/README.md`](project-management/README.md); este arquivo fica só com a teoria — o "porquê" por trás das pastas `domain/`, `application/` e `adapters/` que vocês vão encontrar lá.

**Referência principal:** este material segue de perto o artigo de Herberto Graça, ["Explicit Architecture #1: DDD, Hexagonal, Onion, Clean, CQRS... How I put it all together"](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/) — a leitura recomendada para quem quiser ir além do que cabe nesta aula. O artigo faz exatamente o que o título promete: mostra que Hexagonal, Onion, Clean Architecture e DDD não são estilos concorrentes, e sim peças complementares do mesmo quebra-cabeça, e propõe um nome próprio para essa combinação — **Explicit Architecture**.

## Definição

**Arquitetura hexagonal** (também chamada de **Ports and Adapters**) é um estilo arquitetural proposto por Alistair Cockburn em 2005. A ideia central, em uma frase: **a regra de negócio não deve depender de nenhum detalhe técnico** — nem do framework web, nem do banco de dados, nem de uma API externa, nem do formato de mensagem usado para falar com o mundo de fora.

O nome "hexagonal" não tem nada de matemático ou obrigatório — Cockburn desenhou um hexágono só porque precisava de uma forma com vários lados para encaixar várias "portas" ao redor de um núcleo, e o desenho pegou. O que importa não é o hexágono, é a regra de dependência que ele ilustra.

## O problema que essa arquitetura resolve

Em muitos sistemas, o código de negócio fica emaranhado com o código técnico: uma função que calcula desconto de um pedido também sabe fazer `SELECT` no banco, também sabe montar uma resposta HTTP, também sabe formatar um e-mail. Isso custa caro de duas formas:

1. **Testar fica difícil.** Para testar a regra de desconto, é preciso subir um banco de verdade e simular uma requisição HTTP — o teste fica lento, frágil, e testa três coisas ao mesmo tempo.
2. **Mudar fica caro.** Trocar o banco de dados, adicionar uma segunda forma de entrada (uma fila, além do HTTP), ou reusar a mesma regra de negócio em um contexto diferente (um job agendado, por exemplo) exige garimpar a lógica de negócio no meio do código técnico.

A arquitetura hexagonal ataca isso isolando a regra de negócio num núcleo que **não importa nada de fora dele** — e definindo, por meio de interfaces, exatamente como o mundo de fora pode conversar com esse núcleo.

## As peças

### Domínio

O núcleo. Entidades e regras de negócio, escritas em código comum (classes, funções), sem `import express`, sem `import { PrismaClient }`, sem nada de infraestrutura. No projeto desta aula, `Project` (em `project-management/src/modules/projects/domain/Project.ts`) é um exemplo: sabe validar suas próprias regras (etapas não podem se repetir, não dá para avançar além da última) sem saber que existe HTTP ou um banco.

### Portas

Uma **porta** é uma interface que o domínio (ou a camada de aplicação, logo abaixo) declara para dizer "eu preciso que alguém faça isso por mim, não me importa quem". Graça resume isso numa frase direta: "a port is nothing more than a specification of how the tool can use the application core" — uma porta é a especificação de como uma ferramenta externa pode conversar com o núcleo, não o contrário. Existem dois tipos:

- **Porta de entrada** (o que o sistema oferece para fora): normalmente representada pelos próprios casos de uso — "você pode me pedir para criar um projeto, e eu sei fazer isso".
- **Porta de saída** (o que o sistema precisa de fora): uma interface como `ProjectRepository`, que declara "eu preciso salvar e buscar projetos", sem dizer COMO isso é feito.

As portas de saída são o ponto crucial: é a **aplicação** (a lógica de negócio) que define a interface, no seu próprio vocabulário — quem se adapta a ela é o lado de fora, nunca o contrário. Isso é **inversão de dependência** (o "D" do SOLID) aplicada na escala da arquitetura inteira: em vez do núcleo depender de um banco específico, existe uma interface no meio, e tanto o núcleo quanto o banco dependem dela.

> **O erro mais comum ao desenhar uma porta**, segundo o mesmo artigo: "it is of utmost importance that the Ports are created to fit the Application Core needs and not simply mimic the tools APIs" — a porta precisa ser desenhada no vocabulário do NEGÓCIO, não copiar a API da ferramenta por trás dela. `ProjectRepository` tem `save`/`findById`/`findAll` porque é isso que os casos de uso de `projects` precisam — não porque é isso que um cliente SQL ou o Prisma oferecem. Se a porta ganhasse um método tipo `runQuery(sql: string)`, ela deixaria de ser uma abstração do negócio e viraria só um disfarce fino para "SQL", amarrada à tecnologia por trás — exatamente o acoplamento que a arquitetura existe para evitar.

### Adaptadores

Um **adaptador** implementa uma porta com uma tecnologia concreta. Existem dois tipos, espelhando os dois tipos de porta:

- **Adaptador primário** (também chamado de *driving* ou *"in"*): traduz um estímulo do mundo externo para uma chamada a um caso de uso. Um Controller HTTP é o exemplo mais comum — ele pega uma requisição, entende o que o cliente quer, e chama o caso de uso certo. É quem **aciona** a aplicação. Outros exemplos: um handler de fila de mensagens, um comando de CLI, um resolver de GraphQL.
- **Adaptador secundário** (também chamado de *driven* ou *"out"*): implementa uma porta de saída com uma tecnologia real. `InMemoryProjectRepository` e um futuro `PrismaProjectRepository` são dois adaptadores secundários diferentes para a MESMA porta `ProjectRepository` — a aplicação não sabe (nem precisa saber) qual dos dois está em uso.

### Camada de aplicação (casos de uso)

Entre o domínio puro e os adaptadores fica a camada de aplicação: **casos de uso** que orquestram o domínio para realizar uma operação completa (ex.: `CreateProject` — pede um id novo à porta de saída, deixa a entidade validar as regras, manda salvar). Um caso de uso depende só de portas, nunca de uma implementação concreta.

### Composition root

Em algum lugar do sistema, alguém precisa efetivamente **escolher** qual adaptador concreto vai implementar cada porta e juntar tudo. Esse lugar único é a **composition root** — no projeto desta aula, é `project-management/src/server.ts`. É o único arquivo que tem permissão de conhecer os adaptadores concretos (`InMemoryProjectRepository`, o `Express`, etc.); todo o resto do sistema só conhece interfaces.

## O diagrama

```
              adaptadores primários                 adaptadores secundários
               (driving / "in")                       (driven / "out")
        ┌─────────────────────┐                  ┌─────────────────────┐
        │   HTTP (Controller)   │                  │   Banco de dados     │
        │   CLI, fila, etc.      │──┐          ┌──▶│   (ou memória, em     │
        └─────────────────────┘  │          │    │   dev/teste)           │
                                  ▼          │    └─────────────────────┘
                         ┌──────────────────────────┐
                         │   PORTA DE ENTRADA          │
                         │   (o caso de uso em si)      │
                         │──────────────────────────│
                         │   camada de APLICAÇÃO        │
                         │   (casos de uso)               │
                         │──────────────────────────│
                         │   DOMÍNIO                      │
                         │   (entidades, regras)            │
                         │──────────────────────────│
                         │   PORTA DE SAÍDA                 │
                         │   (ex.: um Repository)             │
                         └──────────────────────────┘
```

**A regra de dependência: as setas sempre apontam para dentro.** Um adaptador depende de uma porta; uma porta é definida pela aplicação/domínio; o domínio não depende de nada fora dele. Nunca o contrário — o domínio jamais importa um adaptador.

## Como isso se compara com o que vocês já conhecem

### Arquitetura em camadas (a mais comum)

A arquitetura em camadas tradicional (apresentação → serviço → persistência) parece com isso à primeira vista, mas normalmente a dependência aponta **para baixo até o banco**: a camada de serviço importa a camada de persistência diretamente, sem uma interface no meio. Funciona, mas trocar de banco (ou testar sem ele) tende a vazar para cima. A Aula 03 já discutiu a diferença entre organizar por camada técnica e organizar por funcionalidade — hexagonal soma uma segunda pergunta a essa discussão: não é só ONDE o código mora, é PARA ONDE ele aponta.

### Clean Architecture

A Clean Architecture (Robert C. Martin) é, na prática, a mesma ideia da hexagonal com um desenho e um vocabulário diferentes: círculos concêntricos (Entities → Use Cases → Interface Adapters → Frameworks & Drivers) em vez de um hexágono com portas ao redor. A regra é idêntica: as setas de dependência só apontam para dentro, e a camada mais interna (Entities) não sabe nada sobre as mais externas. Se vocês já entenderam hexagonal, já entenderam Clean Architecture — muda o nome das camadas, não a regra.

### Onion Architecture, DDD e a "Explicit Architecture" de Graça

O artigo de referência desta aula não trata hexagonal, Onion Architecture, Clean Architecture e DDD como quatro escolhas concorrentes — trata como quatro respostas complementares para perguntas diferentes. Na formulação dele: "the Onion Architecture picks up the DDD layers and incorporates them into the Ports & Adapters Architecture". Ou seja: Ports & Adapters já diz COMO separar "dentro" de "fora"; a Onion Architecture pega essa ideia e detalha o que fica DENTRO do hexágono usando o vocabulário do DDD — e é essa combinação que ele chama de **Explicit Architecture**.

Duas camadas dentro do "núcleo" que o artigo distingue com cuidado — e que este projeto simplifica, de propósito:

- **Application Services** — o que este material vem chamando de "casos de uso" (`CreateProject`, `GrantModuleAccess`...). Orquestram: pedem algo a uma porta, chamam o domínio, devolvem o resultado. Não deveriam conter regra de negócio própria.
- **Domain Services** — para regra de negócio que não pertence naturalmente a UMA entidade só, porque envolve várias ao mesmo tempo. O artigo é direto: "Domain Logic should stay out of the application layer!" — se uma regra de negócio some vaza para dentro de um Application Service, é sinal de que faltou um Domain Service (ou que a regra deveria estar na própria entidade).

Neste projeto, `Project.create()`/`Project#advance()` absorvem toda a regra sozinhas (é um agregado simples), então não existe nenhum Domain Service — só Application Services conversando direto com o domínio. Se um dia `projects` precisasse de uma regra que comparasse DOIS projetos entre si (ex.: "não pode haver dois projetos com o mesmo nome no sistema todo"), aí sim provavelmente valeria criar um Domain Service para abrigar essa regra, em vez de espalhá-la pelos casos de uso.

O artigo também retoma, com outro nome, uma discussão que a Aula 03 já fez: ele defende organizar o código **"by component"** (por sub-domínio/funcionalidade — o que a Aula 03 chamou de *package by feature*) em vez de **"by layer"** (uma pasta `controllers/`, uma `services/`, uma `repositories/` cada uma com arquivos de TODOS os assuntos misturados). `modules/access/`, `modules/projects/` e `modules/reports/` neste projeto são exatamente esse recorte "by component" — e cada um, por dentro, tem sua própria mini-arquitetura em camadas (`domain/`, `application/`, `adapters/`).

### Domínio anêmico x domínio rico

Um risco ao adotar qualquer uma dessas arquiteturas é criar um **domínio anêmico**: entidades que são só um saco de campos públicos (`getters`/`setters`), com toda a regra de negócio jogada nos casos de uso. Isso funciona, mas desperdiça o principal benefício de ter um domínio isolado — as invariantes deixam de estar protegidas num único lugar. `Project.create()` e `Project#advance()` (no projeto desta aula) são exemplos de **domínio rico**: a própria entidade recusa um estado inválido (etapas repetidas, avançar além da última etapa), em vez de confiar que todo caso de uso vai lembrar de checar isso.

## Quando vale a pena (e quando não vale)

Hexagonal não é grátis. Cada porta é uma interface a mais, cada caso de uso é uma classe a mais, a composition root precisa juntar tudo manualmente (ou com um container de DI). Para um script de 200 linhas que nunca vai trocar de banco nem precisa ser testado isoladamente, essa indireção é custo puro, sem benefício — é abstração por precaução, não por necessidade real (a mesma discussão de "custo da abstração excessiva" que está nos Conteúdos desta aula).

Os sinais de que vale a pena:

- A regra de negócio é complexa o bastante para merecer testes rápidos e isolados, sem subir infraestrutura.
- Existe (ou é plausível que exista) mais de uma forma de entrada (HTTP hoje, uma fila amanhã) ou mais de uma tecnologia de persistência ao longo da vida do projeto.
- O time quer poder testar a regra de negócio sem depender de um banco/serviço externo disponível.

Os sinais de que é over-engineering:

- Existe **uma porta com uma única implementação**, que nunca vai mudar, e ninguém testa o caso de uso com um fake — a interface existe só "porque é boa prática", sem nenhum benefício sendo exercido de verdade.
- O caso de uso só repassa a chamada para o repositório, sem nenhuma regra própria — é indireção sem decisão.

## Erros comuns

1. **Domínio anêmico dentro de uma casca hexagonal** — ver acima. A arquitetura não substitui pensar sobre onde as invariantes moram.
2. **Vazar um detalhe de adaptador para dentro da porta** — a porta imitando a API da ferramenta em vez da necessidade do negócio (ver a citação de Graça acima). Uma porta como `ProjectRepository` não deveria ter um método `findByRawSql(query: string)` — isso amarra a porta a um banco relacional específico, quebrando o propósito de ela ser substituível.
3. **Composition root espalhada.** Se mais de um arquivo decide qual adaptador concreto usar, a regra "só um lugar conhece os detalhes técnicos" já quebrou.
4. **Confundir "ter uma pasta chamada `domain/`" com "seguir a regra de dependência".** O nome da pasta não garante nada — o que garante é revisar as importações: um arquivo em `domain/` que importa algo de `adapters/` é uma violação, não importa como as pastas se chamem.
5. **Colocar regra de negócio num Application Service em vez de num Domain Service (ou na própria entidade).** Um caso de uso que acumula `if`s de negócio, em vez de só orquestrar chamadas ao domínio, é o mesmo problema do item 1 com outro nome — ver a distinção Application Services x Domain Services acima.

## Checklist rápido para revisar um pull request

- [ ] Algum arquivo em `domain/` importa `express`, um cliente de banco, ou qualquer coisa de `adapters/`? (Não deveria.)
- [ ] Algum caso de uso em `application/` importa um adaptador concreto (ex.: `InMemoryProjectRepository`) em vez da porta (`ProjectRepository`)? (Não deveria.)
- [ ] Um módulo de negócio importa o adaptador de OUTRO módulo diretamente (em vez de reaproveitar uma porta, ou receber algo pronto pela composition root)? (Vale a pena parar e discutir — às vezes é aceitável, ver a discussão sobre `reports`/`projects` no README do projeto.)
- [ ] Existe mais de um lugar no código escolhendo qual adaptador concreto usar? (Deveria haver só a composition root.)

## Para ir além: CQRS e desacoplamento entre módulos

O artigo de referência vai além do que esta aula cobre — vale só registrar os dois assuntos para quando a disciplina voltar a eles:

- **CQRS (Command/Query Responsibility Segregation).** Neste projeto, um Controller chama um caso de uso diretamente (`Controller → Application Service → Repository → Entity`). O artigo descreve uma variação: em vez disso, o Controller despacha um **Command** ou uma **Query** para um *bus*, que sabe (por configuração, não por import direto) qual *handler* deve tratar aquilo. Isso desacopla ainda mais o adaptador primário do caso de uso específico — custa mais indireção, então só compensa em sistemas com MUITOS casos de uso ou que precisam repor lógica transversal (log, autorização, transação) num único lugar do bus, em vez de repeti-la em cada Controller.
- **Domain Events / Application Events.** A pergunta "como o módulo `reports` fica sabendo que um projeto novo foi criado, sem importar nada de `projects`?" (uma versão mais desacoplada do que este projeto faz, onde `reports` importa a porta `ProjectRepository` diretamente) tem uma resposta baseada em eventos: `projects` publica um evento tipo `ProjectCreated`; quem quiser reagir (incluindo `reports`) se inscreve nesse evento, sem que `projects` precise saber quem está ouvindo. É o mesmo mecanismo, na escala de um processo só, que a Aula 9 do planejamento (mensageria e arquitetura orientada a eventos) trata na escala de vários serviços — e a "Discussão para aulas futuras" deste `aula06.md` já aponta para essa mesma direção ao perguntar o que muda se este sistema precisasse rodar em mais de uma instância.

## Ver também

- [`project-management/README.md`](project-management/README.md) — tour completo pelo código desta aula, com a mesma teoria aplicada arquivo a arquivo.
- [`aula06.md`](aula06.md) — plano da aula, atividades e discussões em sala.

## Referências

- GRAÇA, Herberto. **Explicit Architecture #1: DDD, Hexagonal, Onion, Clean, CQRS, ... How I put it all together.** 16 nov. 2017. Disponível em: <https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/>. Acesso em: 16 set. 2026. — referência principal deste material; leitura recomendada na íntegra.
- COCKBURN, Alistair. **Hexagonal architecture.** 2005. A publicação original que nomeia o estilo Ports and Adapters.
- MARTIN, Robert; HENNEY, Kelvin. **Arquitetura Limpa: o guia do Artesão Para Estrutura e Design de Software.** Alta Books, 2019 — já listado na bibliografia básica da disciplina, ver [`../ementa.md`](../ementa.md).
