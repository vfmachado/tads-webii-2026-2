import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createApp } from '../../src/server.js';
import { ChannelManager } from '../../src/chat/ChannelManager.js';
import { attachChatServer } from '../../src/chat/webSocketHandler.js';
import { expectNoMessage, waitForMessage, waitForOpen } from '../helpers/wsHelpers.js';

/**
 * Testes de ponta a ponta com sockets DE VERDADE (não mocks) contra um
 * servidor HTTP+WebSocket real, numa porta efêmera — mesma filosofia das
 * Aulas 02/03/04 (testar a colaboração real, não uma simulação dela).
 *
 * Cuidado de leitura: `waitForMessage(socket)` só REGISTRA um listener e
 * devolve uma Promise — ela não "espera" nada até ser `await`ada. Por
 * isso, sempre que um teste precisa garantir que não perdeu uma mensagem
 * por causa de timing, ele chama `waitForMessage` ANTES de disparar a
 * ação que gera essa mensagem, e só dá `await` no resultado DEPOIS.
 */
describe('Chat via WebSocket', () => {
  let httpServer: http.Server;
  let baseUrl: string;
  let sockets: WebSocket[];

  beforeEach(async () => {
    const channelManager = new ChannelManager();
    const app = createApp(channelManager);
    httpServer = http.createServer(app);
    attachChatServer(httpServer, channelManager);
    sockets = [];

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Endereço do servidor de teste inesperado');
    }
    baseUrl = `ws://127.0.0.1:${address.port}/ws`;
  });

  afterEach(async () => {
    for (const socket of sockets) socket.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function openClient(): WebSocket {
    const socket = new WebSocket(baseUrl);
    sockets.push(socket);
    return socket;
  }

  // `socket.once('open', ...)` só dispara se registrado ANTES do evento
  // acontecer — por isso só esperamos `open` quando o socket ainda não
  // terminou de conectar (necessário porque alguns testes chamam `join`
  // mais de uma vez no mesmo socket, para trocar de canal ou reentrar).
  async function join(socket: WebSocket, channel: string, username: string): Promise<unknown> {
    if (socket.readyState !== WebSocket.OPEN) {
      await waitForOpen(socket);
    }
    const ack = waitForMessage(socket);
    socket.send(JSON.stringify({ type: 'join', channel, username }));
    return ack;
  }

  it('confirma a entrada com a lista de membros do canal', async () => {
    const alice = openClient();

    const joined = await join(alice, 'geral', 'Alice');

    expect(joined).toEqual({ type: 'joined', channel: 'geral', members: ['Alice'] });
  });

  it('avisa os membros já presentes quando alguém entra', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');

    const bob = openClient();
    const systemForAlice = waitForMessage(alice);
    const bobJoined = (await join(bob, 'geral', 'Bob')) as { members: string[] };

    expect(bobJoined.members.sort()).toEqual(['Alice', 'Bob']);
    expect(await systemForAlice).toEqual({ type: 'system', channel: 'geral', text: 'Bob entrou no canal' });
  });

  it('transmite uma mensagem de chat para todo o canal, inclusive quem enviou', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');
    const bob = openClient();
    const systemForAlice = waitForMessage(alice);
    await join(bob, 'geral', 'Bob');
    await systemForAlice; // consome o "Bob entrou no canal" antes de seguir

    const aliceReceived = waitForMessage(alice);
    const bobReceived = waitForMessage(bob);
    bob.send(JSON.stringify({ type: 'message', text: 'oi, pessoal' }));

    const expected = { type: 'message', channel: 'geral', username: 'Bob', text: 'oi, pessoal', at: expect.any(String) };
    expect(await aliceReceived).toEqual(expected);
    expect(await bobReceived).toEqual(expected);
  });

  it('não vaza mensagens entre canais diferentes', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');
    const carol = openClient();
    await join(carol, 'dev', 'Carol');

    const carolShouldNotReceive = expectNoMessage(carol);
    alice.send(JSON.stringify({ type: 'message', text: 'só para o canal geral' }));

    await carolShouldNotReceive;
  });

  it('rejeita mensagem de chat antes de entrar em um canal', async () => {
    const alice = openClient();
    await waitForOpen(alice);

    const errorPromise = waitForMessage(alice);
    alice.send(JSON.stringify({ type: 'message', text: 'oi' }));

    expect(await errorPromise).toEqual({ type: 'error', message: 'Entre em um canal antes de enviar mensagens' });
  });

  it('responde com erro a uma mensagem malformada, sem derrubar a conexão', async () => {
    const alice = openClient();
    await waitForOpen(alice);

    const errorPromise = waitForMessage(alice);
    alice.send('isto não é um JSON válido');

    const response = (await errorPromise) as { type: string; message: string };
    expect(response.type).toBe('error');

    // a conexão continua viva depois do erro
    const joined = await join(alice, 'geral', 'Alice');
    expect(joined).toEqual({ type: 'joined', channel: 'geral', members: ['Alice'] });
  });

  it('avisa o canal quando alguém sai explicitamente ("leave")', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');
    const bob = openClient();
    const systemBobJoined = waitForMessage(alice);
    await join(bob, 'geral', 'Bob');
    await systemBobJoined;

    const systemForAlice = waitForMessage(alice);
    bob.send(JSON.stringify({ type: 'leave' }));

    expect(await systemForAlice).toEqual({ type: 'system', channel: 'geral', text: 'Bob saiu do canal' });
  });

  it('avisa o canal quando alguém desconecta sem avisar', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');
    const bob = openClient();
    const systemBobJoined = waitForMessage(alice);
    await join(bob, 'geral', 'Bob');
    await systemBobJoined;

    const systemForAlice = waitForMessage(alice);
    bob.close();

    expect(await systemForAlice).toEqual({ type: 'system', channel: 'geral', text: 'Bob saiu do canal' });
  });

  it('avisa o canal antigo quando o cliente troca de canal direto (join sem leave explícito)', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');
    const bob = openClient();
    const systemBobJoined = waitForMessage(alice);
    await join(bob, 'geral', 'Bob');
    await systemBobJoined;

    const systemForAlice = waitForMessage(alice);
    await join(bob, 'dev', 'Bob');

    expect(await systemForAlice).toEqual({ type: 'system', channel: 'geral', text: 'Bob saiu do canal' });
  });

  it('reentrar no mesmo canal não avisa saída (ainda é o mesmo canal)', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');

    const rejoined = await join(alice, 'geral', 'Alice');

    expect(rejoined).toEqual({ type: 'joined', channel: 'geral', members: ['Alice'] });
  });

  it('GET /api/channels reflete os canais ativos e a contagem de membros', async () => {
    const alice = openClient();
    await join(alice, 'geral', 'Alice');
    const bob = openClient();
    const systemBobJoined = waitForMessage(alice);
    await join(bob, 'geral', 'Bob');
    await systemBobJoined;

    const address = httpServer.address();
    if (address === null || typeof address === 'string') throw new Error('endereço inesperado');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/channels`);
    const channels = await response.json();

    expect(channels).toEqual([{ name: 'geral', memberCount: 2 }]);
  });
});
