# Aula 06 — Arquitetura em camadas, hexagonal, Clean Architecture e Ports and Adapters

## Objetivo

Separar regra de negócio de detalhes tecnológicos (framework, banco, HTTP) de forma explícita no código Node/TS. Ao final da aula, o estudante deve saber apontar, em qualquer arquivo do projeto desta pasta, se ele é domínio, porta, caso de uso ou adaptador — e explicar por que a seta de dependência entre essas camadas só pode apontar para dentro.

**Nota de reordenação:** este é o conteúdo da "Aula 5" original do planejamento em [`../aulas.md`](../aulas.md). Ele foi deslocado para a Aula 06 porque a Aula 05 antecipou parte da Aula 10 (autenticação e autorização) sobre o projeto `rede-social` — ver [`../Aula05/aula05.md`](../Aula05/aula05.md). Esta aula usa um projeto novo (gerenciamento de projetos) para apresentar a arquitetura hexagonal "do zero", sem competir com as decisões de framework/persistência já tomadas em `rede-social`.

## Conteúdos

* Arquitetura em camadas x hexagonal x Clean Architecture — o que cada uma resolve.
* Entidades, casos de uso, adaptadores primários e secundários.
* Domínio anêmico x domínio rico; custo da abstração excessiva quando não há benefício real.
* Independência de framework e de banco de dados como meta prática (não dogma).

## Material desta pasta

**[`arquitetura-hexagonal.md`](arquitetura-hexagonal.md)** — o material de conceito: definição, peças (domínio, portas, adaptadores, composition root), comparação com arquitetura em camadas/Clean Architecture/Onion Architecture, quando vale a pena e quando é over-engineering, erros comuns e um checklist de revisão. Baseado no artigo de referência de Herberto Graça (link e citação completa no fim do arquivo) — comecem a leitura por aqui, antes de entrar no código.

Um projeto completo e funcional: [`project-management/`](project-management/), uma API de gerenciamento de projetos organizados em etapas configuráveis, com autorização por módulo concedida em tempo de execução por um administrador.

```bash
cd project-management
npm install
npm test               # suíte completa (unit + integration + e2e)
npm run test:coverage   # 100% de cobertura
npm run dev              # http://localhost:3004
```

O [`README.md`](project-management/README.md) do projeto é o material principal desta aula: explica o que é arquitetura hexagonal, faz um tour por cada diretório do código (domínio → porta → caso de uso → adaptador), descreve os três módulos de negócio (`access`, `projects`, `reports`) e traz um roteiro de `curl` demonstrando o requisito central — uma concessão de acesso feita pelo admin já vale na próxima requisição do usuário, sem logout e sem cache.

Cada arquivo de `src/` tem, no topo, um comentário explicando onde ele se encaixa na arquitetura — é o material de leitura principal, mais até do que este `aula06.md`.

