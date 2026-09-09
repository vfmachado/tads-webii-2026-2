import http from 'node:http';
import { createApp } from './server.js';
import { ChannelManager } from './chat/ChannelManager.js';
import { attachChatServer } from './chat/webSocketHandler.js';

/**
 * ETAPA "um servidor HTTP, duas coisas plugadas nele": `http.createServer(app)`
 * cria o servidor de verdade; o Express (`app`) só sabe lidar com
 * requisições HTTP normais. `attachChatServer` pluga o `ws` NO MESMO
 * `httpServer`, escutando o evento `upgrade` que o Express nunca vê. Por
 * isso a ordem importa: o servidor HTTP precisa existir ANTES de anexar o
 * WebSocket a ele, e só depois dos dois prontos é que chamamos `listen()`.
 */
const channelManager = new ChannelManager();
const app = createApp(channelManager);
const httpServer = http.createServer(app);
attachChatServer(httpServer, channelManager);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3005;
httpServer.listen(PORT, () => {
  console.log(`AulaWebSocket rodando em http://localhost:${PORT} (WebSocket em ws://localhost:${PORT}/ws)`);
});
