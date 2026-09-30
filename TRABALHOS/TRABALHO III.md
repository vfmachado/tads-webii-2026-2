# Trabalho III

## DATA 21/10/2026

## Contexto

Este trabalho usa o projeto [`notificacoes/`](../Aula07/notificacoes/), apresentado na [Aula 07](../Aula07/aula07.md). É um serviço de notificações multicanal (fake, SMS e e-mail) em TypeScript, Express e Prisma ORM que funciona, mas foi escrito propositalmente sem nenhum padrão arquitetural: configuração, acesso ao banco, regras de negócio, integração com os "provedores" de envio e rotas HTTP estão todos em um único arquivo ([`src/index.ts`](../Aula07/notificacoes/src/index.ts)).

O objetivo é refatorar esse serviço para **Ports and Adapters (arquitetura hexagonal)**, aplicando os conceitos da [Aula 06](../Aula06/aula06.md), **sem alterar o comportamento da API**. O material de conceito é o [`Aula06/arquitetura-hexagonal.md`](../Aula06/arquitetura-hexagonal.md), e o projeto [`Aula06/project-management`](../Aula06/project-management/) serve de referência de organização — não de molde a ser copiado.

## Objetivo

Transformar o serviço "single file" em uma aplicação com domínio, casos de uso, portas e adaptadores claramente separados, em que a regra de negócio não depende de Express, Prisma nem dos provedores de envio. Ao final, o aluno deve saber apontar, em qualquer arquivo do projeto, qual papel ele cumpre na arquitetura, e demonstrar que um canal ou adaptador novo entra sem tocar no domínio nem nos casos de uso.

## Conteúdos trabalhados

* Identificação de responsabilidades e regras de negócio escondidas em código acoplado.
* Refatoração segura: testes caixa-preta como rede de segurança antes de mover código.
* Domínio independente de framework e de banco de dados.
* Casos de uso como portas de entrada; portas de saída expressas na linguagem do domínio.
* Adaptadores primários (HTTP, CLI) e secundários (Prisma, em memória, provedores de envio).
* Composition root e direção das dependências.
* Testes em camadas: domínio, casos de uso com dublês e API de ponta a ponta.

## Preparando o ambiente

```bash
cd Aula07/notificacoes
cp .env.example .env
npm install
npm run prisma:migrate    # cria o banco SQLite (dev.db)
npm run dev               # http://localhost:3007
```

Trabalhem em uma cópia (ou branch) do projeto. As requisições de exemplo estão em [`test.http`](../Aula07/notificacoes/test.http).

## Atividades obrigatórias

Seguir o **roteiro de refatoração** do [`README.md`](../Aula07/notificacoes/README.md#roteiro-de-refatoração-para-ports-and-adapters) do projeto, da Etapa 0 à Etapa 9. O roteiro indica o que fazer em cada etapa, não como fazer: as decisões de nomes, pastas, interfaces e granularidade das portas são de vocês e precisam ser justificadas.

Resumo das etapas:

0. Entender o sistema, mapear responsabilidades e listar as regras de negócio.
1. Criar a rede de segurança (testes caixa-preta da API).
2. Descobrir e isolar o domínio.
3. Definir os casos de uso (portas de entrada).
4. Definir as portas de saída.
5. Implementar os adaptadores secundários (Prisma, em memória, canais de envio).
6. Reescrever o HTTP como adaptador primário fino.
7. Criar o composition root.
8. Escrever testes em camadas.
9. Provar a arquitetura: novo canal, provedor de e-mail real, adaptador CLI e execução só com repositórios em memória — tudo sem alterar domínio e casos de uso.

## Critérios de avaliação

* **Contrato preservado:** todas as rotas respondem com os mesmos status e formatos da versão original, comprovado pelos testes da Etapa 1, que devem passar sem alteração ao final.
* **Domínio isolado:** domínio e casos de uso não importam `express`, `@prisma/client` nem outra biblioteca de infraestrutura.
* **Sem duplicação de regras:** cada regra de negócio existe em um único lugar. As divergências entre as cópias do código original devem ter sido identificadas e registradas.
* **Composition root único:** um só lugar instancia e conecta as dependências, e é o único que lê `process.env`.
* **Testabilidade:** os casos de uso são testáveis sem banco, sem HTTP e sem aleatoriedade/tempo real.
* **Extensibilidade demonstrada:** os itens da Etapa 9 foram feitos sem alterar domínio e casos de uso.
* **Erros tratados:** nenhum erro interno (stack trace, mensagem do Prisma) chega ao cliente.
* **Documentação:** o README do projeto traz um diagrama (pode ser Mermaid) do hexágono, das portas e dos adaptadores, e um parágrafo justificando as decisões de granularidade das portas.
* **Checklist:** o [checklist de entrega](../Aula07/notificacoes/README.md#checklist-de-entrega) do README da Aula 07 está completo.

## Entrega

Repositório (ou cópia do projeto `notificacoes/`) contendo a versão refatorada, suíte de testes em camadas, diagrama da arquitetura e o registro das decisões solicitadas.

Gravação da explicação (15 minutos) do projeto, cobrindo:
- Quais responsabilidades e regras de negócio foram encontradas no arquivo original (e quais estavam duplicadas ou divergentes).
- Como ficou o domínio e onde vivem as regras específicas de cada canal.
- Quais portas foram definidas e por que com essa granularidade.
- Como a composição das dependências foi feita.
- Demonstração da Etapa 9: o canal novo e o adaptador CLI funcionando, e o que precisou (ou não) ser alterado para adicioná-los.
- Decisões técnicas.
