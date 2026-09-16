import { createServer } from './server.js';

// HEXAGONAL: bootstrap puro — só escolhe a porta e sobe o processo HTTP.
// Nenhuma regra de negócio nem decisão de composição mora aqui; tudo isso
// já aconteceu dentro de `createServer()`.
const PORT = process.env.PORT ? Number(process.env.PORT) : 3004;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Aula 06 - gerenciamento de projetos (arquitetura hexagonal) rodando em http://localhost:${PORT}`);
});
