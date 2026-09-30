# Aula 07 — Serviço de notificações multicanal

Uma API que envia notificações para contatos por três canais:

| Canal   | O que acontece de verdade                                                     |
| ------- | ----------------------------------------------------------------------------- |
| `fake`  | A mensagem vai para uma caixa de entrada em memória (`GET /fake-inbox/:id`).  |
| `sms`   | Imprime no console e falha aleatoriamente (`SMS_FAILURE_RATE` no `.env`).      |
| `email` | Imprime no console um "e-mail" com remetente, destinatário e assunto.         |

**O código inteiro está em um único arquivo: [`src/index.ts`](src/index.ts).** Configuração, banco de dados, regras de negócio, integração com provedores e rotas HTTP estão todos misturados, de propósito. O sistema funciona — e o trabalho desta aula é transformá-lo em uma arquitetura **Ports and Adapters (hexagonal)** sem mudar o comportamento da API.

O material de conceito é o da aula anterior: [`Aula06/arquitetura-hexagonal.md`](../../Aula06/arquitetura-hexagonal.md). O projeto [`Aula06/project-management`](../../Aula06/project-management/) serve de referência de como um projeto hexagonal fica organizado.

---

## Como rodar

```bash
cd Aula07/notificacoes
cp .env.example .env
npm install
npm run prisma:migrate    # cria o banco SQLite (dev.db)
npm run dev               # http://localhost:3007
```

As requisições de exemplo estão em [`test.http`](test.http) (extensão REST Client do VS Code).

## A API

| Método | Rota                          | Descrição                                                     |
| ------ | ----------------------------- | ------------------------------------------------------------- |
| POST   | `/contacts`                   | Cria contato (`name`, `email?`, `phone?`, `optOut?`)          |
| GET    | `/contacts`                   | Lista contatos                                                |
| GET    | `/contacts/:id`               | Detalhe de um contato                                         |
| POST   | `/notifications`              | Envia (`contactId`, `channels[]`, `message`, `subject?`)      |
| GET    | `/notifications`              | Lista, com filtros `?status=`, `?channel=`, `?contactId=`     |
| GET    | `/notifications/:id`          | Detalhe de uma notificação                                    |
| POST   | `/notifications/:id/retry`    | Reenvia uma notificação que falhou                            |
| GET    | `/fake-inbox/:contactId`      | Mensagens recebidas pelo canal `fake`                         |

---

## Roteiro de refatoração para Ports and Adapters

O roteiro diz **o que** fazer em cada etapa, não **como**. As decisões de nomes, pastas, interfaces e granularidade são de vocês — e devem ser justificáveis. Idealmente a API precisa continuar funcionando em todas etapas.

### Etapa 0 — Entender antes de mexer

- Rodem o sistema e exercitem todas as rotas do `test.http`, inclusive os caminhos de erro.
- Leiam o `src/index.ts` inteiro e marquem cada trecho com a responsabilidade que ele cumpre (configuração, entrada HTTP, validação de formato, regra de negócio, persistência, integração externa…).
- Façam uma lista de **todas as regras de negócio** que vocês encontrarem. Elas estão espalhadas e algumas aparecem mais de uma vez — verifiquem se as cópias são realmente iguais.
- Registrem o comportamento atual (status HTTP e formato das respostas) de cada rota. Esse é o contrato que não pode quebrar.

### Etapa 1 — Rede de segurança

- Antes de mover qualquer código, escrevam testes que exercitem a API por fora (caixa-preta), cobrindo os casos de sucesso e de erro levantados na Etapa 0.
- Encontrem um jeito de tornar o comportamento aleatório e dependente de tempo (falha do SMS, limite por minuto, datas) controlável nos testes. Anotem o que dificultou isso — é um sintoma que a arquitetura deve resolver.

### Etapa 2 — Descobrir o domínio

- Identifiquem os conceitos centrais do negócio e representem-nos em código que **não importa** Express, Prisma nem nenhuma biblioteca de infraestrutura.
- Levem para dentro desses conceitos as regras que pertencem a eles (o que torna um contato válido, quando uma notificação pode ser reenviada, o que cada canal exige…).
- Substituam as strings soltas que representam estados e canais por algo que o compilador consiga verificar.
- Decidam onde vivem as regras que são específicas de um canal e como o domínio fica sabendo delas sem conhecer o provedor.

### Etapa 3 — Casos de uso (portas de entrada)

- Identifiquem as operações que o sistema oferece do ponto de vista de quem o usa, independentemente de HTTP.
- Cada operação vira um caso de uso com entrada e saída próprias, que orquestra o domínio e não sabe de onde veio a requisição.
- Eliminem a duplicação entre "enviar" e "reenviar": a regra deve existir em um só lugar.

### Etapa 4 — Portas de saída

- Listem tudo o que os casos de uso precisam do mundo externo: guardar e buscar dados, entregar mensagens, saber a hora atual, gerar identificadores…
- Para cada necessidade, definam uma porta expressa na linguagem do domínio, não na linguagem da tecnologia que vai implementá-la.
- Reflitam sobre a granularidade: uma porta de envio para todos os canais, ou uma por canal? Qual escolha torna mais fácil adicionar um canal novo?

### Etapa 5 — Adaptadores secundários (driven)

- Implementem as portas de persistência com Prisma. O Prisma Client não pode aparecer fora desses adaptadores.
- Implementem um adaptador para cada canal de envio (fake, SMS, e-mail), preservando o comportamento atual de cada um.
- Criem também implementações em memória das portas de persistência, para uso nos testes.
- Garantam que tipos do Prisma não vazem para o domínio nem para os casos de uso.

### Etapa 6 — Adaptador primário (driving) HTTP

- Reescrevam as rotas Express como um adaptador fino: traduzir a requisição para a entrada do caso de uso, chamá-lo e traduzir a saída (ou o erro) para uma resposta HTTP.
- Separem validação de formato da requisição (responsabilidade do adaptador) das regras de negócio (responsabilidade do domínio).
- Definam como erros do domínio viram status HTTP em um único lugar, e garantam que nenhum erro interno (stack trace, mensagem do Prisma) chegue ao cliente.

### Etapa 7 — Composition root

- Criem um único ponto onde as dependências concretas são instanciadas e conectadas às portas.
- A escolha de implementação (ex.: probabilidade de falha do SMS, banco a usar) deve ser feita ali, a partir da configuração — em nenhum outro lugar se lê `process.env`.
- Verifiquem a direção das dependências: nada dentro do hexágono pode importar algo de fora dele.

### Etapa 8 — Testes em camadas

- Testem o domínio isoladamente, sem banco e sem HTTP.
- Testem os casos de uso usando os adaptadores em memória e dublês das portas de envio.
- Mantenham os testes da Etapa 1 passando sem alteração — eles provam que o contrato da API foi preservado.

### Etapa 9 — Provar que a arquitetura funciona

Cada item abaixo deve ser feito **sem alterar o domínio nem os casos de uso**. Se precisarem alterar, voltem e revejam as fronteiras.

- Adicionem um novo canal (ex.: push ou WhatsApp, também simulado).
- Troquem o provedor de e-mail simulado por um que envie de verdade (ex.: Nodemailer com Ethereal ou Mailtrap), escolhido via configuração.
- Adicionem um segundo adaptador primário (ex.: um CLI que envia uma notificação pela linha de comando) reutilizando os mesmos casos de uso.
- Façam a aplicação subir usando apenas os repositórios em memória, sem Prisma.

---

## Checklist de entrega

- [ ] Todas as rotas respondem com os mesmos status e formatos da versão original.
- [ ] Domínio e casos de uso não importam `express`, `@prisma/client` nem nada de `node_modules` de infraestrutura.
- [ ] Nenhuma regra de negócio está duplicada.
- [ ] Existe um único lugar que instancia e conecta as dependências.
- [ ] Os casos de uso são testáveis sem banco, sem HTTP e sem aleatoriedade.
- [ ] Um canal novo foi adicionado sem tocar no domínio nem nos casos de uso.
- [ ] Um diagrama (pode ser manual/Mermaid) que mostra o hexágono, as portas e os adaptadores do projeto final.
- [ ] Um parágrafo no README justifica as principais decisões de granularidade das portas.
