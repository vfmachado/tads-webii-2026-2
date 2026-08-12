import { createServer } from './server.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3002;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Aula 03 - template Kanban (MVC) rodando em http://localhost:${PORT}`);
});
