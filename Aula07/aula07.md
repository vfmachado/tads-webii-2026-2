# Aula 07 — Refatorando um sistema "single file" para Ports and Adapters

## Objetivo

Aplicar na prática os conceitos da Aula 06: partir de um sistema que funciona, mas tem tudo em um único arquivo, e reorganizá-lo em domínio, portas, casos de uso e adaptadores — sem quebrar o contrato da API.

## Material desta pasta

[`notificacoes/`](notificacoes/) — um serviço de notificações multicanal (fake, SMS e e-mail) em TypeScript, Express e Prisma ORM, escrito propositalmente em um único arquivo ([`src/index.ts`](notificacoes/src/index.ts)).

```bash
cd notificacoes
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev              # http://localhost:3007
```

O [`README.md`](notificacoes/README.md) do projeto descreve a API e traz o **roteiro de refatoração** em etapas, do mapeamento de responsabilidades até a prova de que a nova arquitetura aceita novos canais e novos adaptadores sem tocar no domínio.

Material de conceito: [`../Aula06/arquitetura-hexagonal.md`](../Aula06/arquitetura-hexagonal.md).
