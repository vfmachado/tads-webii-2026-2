import { createServer } from './server.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Aula 02 - versão ANTES (sem MVC) rodando em http://localhost:${PORT}`);
});
