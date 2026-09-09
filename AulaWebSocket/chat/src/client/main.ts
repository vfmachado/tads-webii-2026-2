/**
 * Código que roda no NAVEGADOR (compilado com esbuild para public/main.js
 * — ver package.json). Cada função abaixo é uma etapa do ciclo de vida de
 * uma conexão WebSocket; leiam em ordem.
 */

type ServerMessage =
  | { type: 'joined'; channel: string; members: string[] }
  | { type: 'message'; channel: string; username: string; text: string; at: string }
  | { type: 'system'; channel: string; text: string }
  | { type: 'error'; message: string };

const statusEl = document.getElementById('status') as HTMLElement;
const channelListEl = document.getElementById('channel-list') as HTMLUListElement;
const joinForm = document.getElementById('join-form') as HTMLFormElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const channelInput = document.getElementById('channel') as HTMLInputElement;
const chatSection = document.getElementById('chat') as HTMLElement;
const currentChannelEl = document.getElementById('current-channel') as HTMLElement;
const messagesEl = document.getElementById('messages') as HTMLUListElement;
const messageForm = document.getElementById('message-form') as HTMLFormElement;
const messageInput = document.getElementById('message-text') as HTMLInputElement;

let socket: WebSocket | undefined;
let username = '';

// ETAPA 1 — abrir a conexão.
// `location.protocol` decide `ws://` (página servida por http) ou
// `wss://` (página servida por https, o equivalente seguro de WebSocket
// — TLS por baixo, igual o https faz para o http). O caminho `/ws` é o
// mesmo configurado em `attachChatServer` no servidor.
function connect(): WebSocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const newSocket = new WebSocket(`${protocol}//${location.host}/ws`);

  setStatus('connecting');

  // ETAPA 2 — o handshake terminou e a conexão está aberta. É só a partir
  // daqui que dá para chamar `socket.send(...)` sem erro — antes disso o
  // socket está em `CONNECTING` (readyState 0).
  newSocket.addEventListener('open', () => {
    setStatus('connected');
  });

  // ETAPA 3 — receber. Toda mensagem do servidor chega aqui, sempre como
  // texto (porque é assim que o servidor manda, com `JSON.stringify`).
  // `renderServerMessage` decide o que fazer com cada `type`.
  newSocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    renderServerMessage(message);
  });

  // ETAPA 4 — a conexão fechou. Pode ter sido o servidor derrubando a
  // conexão, uma queda de rede, ou nós mesmos chamando `socket.close()`
  // em algum fluxo futuro. Nesta aula não há reconexão automática — é o
  // desafio proposto no README ("Para ir além").
  newSocket.addEventListener('close', () => {
    setStatus('disconnected');
    chatSection.hidden = true;
  });

  // ETAPA 5 — erro de baixo nível (ex.: o servidor está fora do ar). O
  // evento `error` do WebSocket não carrega detalhes por especificação
  // (por segurança, o browser não expõe a causa); na prática, um `error`
  // é quase sempre seguido de um `close`.
  newSocket.addEventListener('error', () => {
    setStatus('disconnected');
  });

  return newSocket;
}

function setStatus(state: 'connecting' | 'connected' | 'disconnected'): void {
  statusEl.textContent = { connecting: 'conectando...', connected: 'conectado', disconnected: 'desconectado' }[state];
  statusEl.className = `status status-${state}`;
}

// ETAPA 6 — entrar num canal. Só faz sentido chamar depois do evento
// `open` (ETAPA 2); o formulário de entrada dispara a conexão E o envio
// da mensagem `join` juntos, então a UI só mostra a tela de chat depois
// da confirmação `joined` vinda do servidor (ver `renderServerMessage`).
joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  username = usernameInput.value.trim();
  const channel = channelInput.value.trim();
  if (!username || !channel) return;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    socket = connect();
    socket.addEventListener('open', () => sendJoin(channel), { once: true });
  } else {
    sendJoin(channel);
  }
});

function sendJoin(channel: string): void {
  socket!.send(JSON.stringify({ type: 'join', channel, username }));
}

// ETAPA 7 — enviar uma mensagem de chat. Repare que a UI não desenha a
// própria mensagem aqui: ela só manda para o servidor e espera a mesma
// mensagem voltar pelo evento `message` (ETAPA 3), junto com as de todo
// mundo. É uma escolha deliberada (servidor como única fonte de verdade
// sobre ordem/conteúdo) — a alternativa, desenhar otimisticamente e
// reconciliar depois, é mais responsiva mas mais complexa; vale discutir
// esse trade-off em aula.
messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({ type: 'message', text }));
  messageInput.value = '';
});

// ETAPA 8 — reagir ao que o servidor manda.
function renderServerMessage(message: ServerMessage): void {
  if (message.type === 'joined') {
    chatSection.hidden = false;
    currentChannelEl.textContent = `#${message.channel} (${message.members.join(', ')})`;
    messagesEl.replaceChildren();
    return;
  }

  if (message.type === 'message') {
    appendMessage(`${message.username}: ${message.text}`, message.username === username ? 'own' : undefined);
    return;
  }

  if (message.type === 'system') {
    appendMessage(message.text, 'system');
    return;
  }

  appendMessage(`Erro: ${message.message}`, 'error');
}

function appendMessage(text: string, cssClass?: string): void {
  const item = document.createElement('li');
  item.textContent = text;
  if (cssClass) item.className = cssClass;
  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ETAPA 9 — a lista de canais ativos NÃO vem pelo WebSocket: é uma
// consulta pontual via HTTP normal (`GET /api/channels`, ver
// src/server.ts). Repetimos a cada 5s com `setInterval` porque não há
// like um "avise-me quando a lista mudar" para essa informação nesta
// aula — outra boa pergunta para discutir: valeria a pena empurrar isso
// por WebSocket também?
async function refreshChannelList(): Promise<void> {
  const response = await fetch('/api/channels');
  const channels = (await response.json()) as { name: string; memberCount: number }[];

  channelListEl.replaceChildren(
    ...channels.map((channel) => {
      const item = document.createElement('li');
      item.textContent = `${channel.name} (${channel.memberCount})`;
      return item;
    }),
  );
}

refreshChannelList();
setInterval(refreshChannelList, 5000);
