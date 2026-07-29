# Aula 01 — Node.js, SSR x CSR, estrutura de projeto e testes

## Objetivo

Nivelar o runtime Node.js sem perder o rigor técnico, deixando a turma pronta para discutir arquitetura já na Aula 02. Ao final da aula, o estudante deve entender a diferença prática entre renderizar no servidor e renderizar no navegador, saber montar a estrutura mínima de um projeto Node/TypeScript e sair com o hábito de escrever testes desde a primeira linha de código, não como etapa final do projeto.

## Conteúdos

* Node.js: event loop, módulos, execução assíncrona — por que não é "só JavaScript sem o navegador".
* Server-Side Rendering x Client-Side Rendering: onde cada modelo entrega valor e qual o custo de cada um (TTFB, SEO, interatividade, complexidade operacional).
* Estrutura de projeto: `package.json`, `tsconfig.json`, organização de diretórios (`src`, `test`), scripts de build/execução.
* Um primeiro endpoint HTTP com framework (Express).
* Testes como parte do fluxo, não etapa final: pirâmide de testes, o que testar primeiro e por quê.

## Material desta pasta

Esta pasta contém dois projetos independentes, ambos em TypeScript, que implementam a **mesma funcionalidade** (uma lista de tarefas) de duas formas diferentes — para tornar a diferença entre SSR e CSR concreta em vez de apenas conceitual:

```
Aula01/
├── ssr/     → o servidor Express monta o HTML completo (com as tarefas) e envia pronto ao navegador
└── csr/     → o servidor só devolve um HTML "vazio" + JSON; é o navegador que busca os dados e monta a tela
```

Cada projeto tem `package.json`, `tsconfig.json`, código-fonte em `src/` e testes automatizados em `test/` (Vitest + Supertest).

### Rodando o exemplo SSR

```bash
cd ssr
npm install
npm test        # roda os testes automatizados
npm run dev      # sobe o servidor em http://localhost:3000
```

Abra `http://localhost:3000` e depois **View Source** (Ctrl+U) na página — repare que a lista de tarefas já está no HTML recebido, mesmo com o JavaScript desabilitado.

### Rodando o exemplo CSR

```bash
cd csr
npm install
npm test           # roda os testes automatizados
npm run dev        # compila o bundle do cliente e sobe o servidor em http://localhost:3001
```

Abra `http://localhost:3001` e depois **View Source** — repare que o HTML não contém a lista de tarefas, apenas uma `<div id="app">`. A lista só aparece depois que o JavaScript do navegador roda e busca `/api/tasks`. Desligue o JavaScript do navegador e recarregue a página para ver a diferença na prática.

## Atividade em sala

1. Rodar os dois projetos e comparar o "View Source" de cada um.
2. Identificar  situações reais (do dia a dia dos estudantes) em que SSR seria a escolha certa e duas em que CSR seria melhor.
3. Rodar `npm test` nos dois projetos e ler os arquivos em `test/` antes de rodar — tentar prever o que cada teste verifica antes de executar.

## Discussão para a Aula 02

Guardar as dúvidas de arquitetura que surgirem aqui (onde colocar a lógica de negócio, como organizar `src/`, o que aconteceria se o projeto crescesse) — elas serão retomadas formalmente na Aula 02, sobre requisitos arquiteturalmente significativos e atributos de qualidade.
