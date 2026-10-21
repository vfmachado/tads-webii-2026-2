import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3010);
const { app } = createApp();

app.listen(port, () => {
  console.log(`Pedidos (SEM Redis) rodando em http://localhost:${port}`);
});
