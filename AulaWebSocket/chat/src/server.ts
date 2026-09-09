import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChannelManager } from './chat/ChannelManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ETAPA "o HTTP continua existindo": WebSocket substitui HTTP para a
 * troca de mensagens em tempo real, mas não substitui o Express para
 * tudo. Servir o HTML/CSS/JS do frontend e responder uma consulta pontual
 * ("quais canais existem agora?") continuam sendo trabalho de HTTP normal
 * — pedir isso por WebSocket não traria vantagem nenhuma, já que não é
 * um dado que muda a cada instante e precisa ser empurrado. A regra
 * prática: HTTP para "me dê um dado agora"; WebSocket para "me avise
 * quando algo mudar".
 */
export function createApp(channelManager: ChannelManager): Express {
  const app = express();

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/channels', (_req, res) => {
    res.json(channelManager.listChannels());
  });

  return app;
}
