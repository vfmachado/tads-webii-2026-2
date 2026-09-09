import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { ChannelManager, type ChatClient } from './ChannelManager.js';
import { InvalidMessageError, parseClientMessage, serializeServerMessage } from './messages.js';

/**
 * ETAPA "handshake e ciclo de vida da conexão": `WebSocketServer({ server,
 * path })` não abre uma porta nova — ele se conecta ao evento `upgrade`
 * do MESMO servidor HTTP que o Express já está usando (ver `src/index.ts`).
 * Quando o navegador faz `new WebSocket('ws://.../ws')`, o pedido chega
 * como uma requisição HTTP normal com os cabeçalhos `Upgrade: websocket`
 * e `Connection: Upgrade`; o Node emite o evento `upgrade` em vez de
 * `request`, e é aí que o `ws` assume: responde `101 Switching Protocols`
 * e, a partir dali, a mesma conexão TCP vira um canal bidirecional livre
 * de handshake HTTP a cada mensagem — é essa troca de handshake único +
 * canal persistente que faz o WebSocket ser mais barato que fazer
 * polling repetido em HTTP.
 *
 * Cada `connection` deste servidor vive por um tempo indeterminado (ao
 * contrário de uma requisição HTTP, que termina assim que a resposta é
 * enviada). Por isso este arquivo lida com EVENTOS ao longo do tempo
 * (`message`, `close`, `error`) em vez de um único ciclo pedido/resposta.
 */
export function attachChatServer(httpServer: HttpServer, channelManager: ChannelManager): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket: WebSocket) => {
    // ETAPA "quem é este cliente": o protocolo WebSocket não dá identidade
    // nenhuma à conexão além do socket em si — nem sessão, nem usuário.
    // `randomUUID()` é só uma chave interna para o ChannelManager
    // localizar este socket; `username` começa genérico e só ganha
    // sentido depois da mensagem `join` (ver abaixo).
    const client: ChatClient = {
      id: randomUUID(),
      username: 'anônimo',
      send: (payload: string) => socket.send(payload),
    };

    // ETAPA "receber": `ws` entrega cada frame já decodificado como
    // Buffer/string — `data.toString()` normaliza para string antes de
    // tentar interpretar como JSON.
    socket.on('message', (data) => {
      try {
        const message = parseClientMessage(data.toString());
        handleClientMessage(channelManager, client, message);
      } catch (err) {
        // `parseClientMessage` só lança `InvalidMessageError` (nunca deixa
        // um erro de `JSON.parse` escapar cru — ver messages.ts) e
        // `handleClientMessage` não lança nada por conta própria. Ou seja,
        // ao chegar aqui `err` é sempre um `InvalidMessageError`, com uma
        // mensagem segura de devolver ao cliente.
        client.send(serializeServerMessage({ type: 'error', message: (err as InvalidMessageError).message }));
      }
    });

    // ETAPA "desconexão": dispara tanto num fechamento normal (o
    // navegador fechou a aba, `socket.close()`) quanto numa queda de rede
    // detectada pelo SO. Symmetric ao `join`: quem sai (de propósito ou
    // não) libera a vaga no canal e avisa quem ficou.
    socket.on('close', () => {
      const channelName = channelManager.leave(client);
      if (channelName) {
        channelManager.broadcast(
          channelName,
          serializeServerMessage({ type: 'system', channel: channelName, text: `${client.username} saiu do canal` }),
        );
      }
    });
  });

  return wss;
}

function handleClientMessage(channelManager: ChannelManager, client: ChatClient, message: ReturnType<typeof parseClientMessage>): void {
  if (message.type === 'join') {
    // Um cliente só fica em um canal por vez: `ChannelManager#join` já sai
    // do canal anterior sozinho (ver o comentário lá), mas quem estava
    // JUNTO com ele no canal antigo só descobre isso se avisarmos aqui —
    // por isso guardamos o canal anterior ANTES de entrar no novo.
    const previousChannel = channelManager.channelOf(client);
    client.username = message.username;
    const members = channelManager.join(message.channel, client);

    if (previousChannel && previousChannel !== message.channel) {
      channelManager.broadcast(
        previousChannel,
        serializeServerMessage({ type: 'system', channel: previousChannel, text: `${client.username} saiu do canal` }),
      );
    }

    client.send(serializeServerMessage({ type: 'joined', channel: message.channel, members }));
    channelManager.broadcast(
      message.channel,
      serializeServerMessage({ type: 'system', channel: message.channel, text: `${client.username} entrou no canal` }),
      client,
    );
    return;
  }

  if (message.type === 'leave') {
    const channelName = channelManager.leave(client);
    if (channelName) {
      channelManager.broadcast(
        channelName,
        serializeServerMessage({ type: 'system', channel: channelName, text: `${client.username} saiu do canal` }),
      );
    }
    return;
  }

  // message.type === 'message'
  const channelName = channelManager.channelOf(client);
  if (!channelName) {
    client.send(serializeServerMessage({ type: 'error', message: 'Entre em um canal antes de enviar mensagens' }));
    return;
  }

  // Transmite para TODO o canal, inclusive quem enviou: o servidor é a
  // única fonte de verdade sobre a ordem/conteúdo das mensagens — o
  // cliente não desenha a própria mensagem otimisticamente, só reage ao
  // que o servidor ecoa de volta (ver comentário equivalente em
  // src/client/main.ts, etapa 5).
  channelManager.broadcast(
    channelName,
    serializeServerMessage({
      type: 'message',
      channel: channelName,
      username: client.username,
      text: message.text,
      at: new Date().toISOString(),
    }),
  );
}
