# AulaWebSocket — chat por canais

Chat em tempo real organizado por canais, usando WebSocket puro (biblioteca [`ws`](https://github.com/websockets/ws)) sobre o mesmo servidor HTTP do Express. A definição de WebSocket, como o handshake funciona e quando usar (ou não usar) o protocolo estão em [`../aulaWebSocket.md`](../aulaWebSocket.md) — este README é o tour pelo código deste projeto especificamente.

## Rodando

```bash
npm install
npm test               # suíte completa (unit + e2e com sockets reais)
npm run test:coverage   # 100% de cobertura no código do servidor
npm run dev              # compila o cliente (esbuild) e sobe http://localhost:3005
```

## Testando à mão

1. Abrir `http://localhost:3005` em duas abas.
2. Em cada uma, preencher um nome diferente e o mesmo canal (ex.: `geral`) e clicar "Entrar no canal".
3. Mandar uma mensagem em uma aba — ela aparece nas duas (inclusive em quem enviou: o servidor ecoa para todo o canal, ver "Decisões de design" abaixo).
4. Abrir uma terceira aba num canal diferente (ex.: `dev`) e confirmar que ela não recebe as mensagens de `geral`.
5. Fechar uma aba e ver a mensagem de sistema "X saiu do canal" aparecer nas outras.

## Tour pelo código

```
src/
├── index.ts              bootstrap: cria o http.Server, pluga Express E o WebSocket nele
├── server.ts               Express: serve o frontend estático + GET /api/channels (HTTP comum)
├── chat/
│   ├── messages.ts           protocolo de aplicação sobre WebSocket: tipos de mensagem, parse/validação
│   ├── ChannelManager.ts      estado dos canais (quem está onde) — não sabe o que é WebSocket
│   └── webSocketHandler.ts    adaptador: liga o `ws` ao ChannelManager, trata o ciclo de vida da conexão
└── client/
    └── main.ts                código do navegador (compilado para public/main.js), com cada etapa comentada

public/
├── index.html               formulário de entrada + área de chat
└── style.css                 estilo (sem relevância para a aula)
```

### `chat/messages.ts` — o protocolo por cima do WebSocket

WebSocket transporta só bytes — não existe verbo, rota nem `Content-Type` embutido como no HTTP. Este arquivo define o contrato que cliente e servidor combinam por fora do protocolo: toda mensagem é um JSON com um campo `type`.

- Cliente → servidor: `join` (entrar num canal), `leave` (sair), `message` (mandar um texto no canal atual).
- Servidor → cliente: `joined` (confirmação + lista de membros), `message` (uma mensagem de chat), `system` (aviso de entrada/saída), `error` (mensagem inválida).

`parseClientMessage` valida e lança `InvalidMessageError` para qualquer formato inesperado — é código puro, testável sem abrir socket nenhum (ver `test/unit/chat/messages.test.ts`).

### `chat/ChannelManager.ts` — estado dos canais

Não conhece WebSocket, HTTP nem JSON — só sabe "quem está em qual canal" e "como mandar algo para quem está num canal", através da interface mínima `ChatClient` (`id` + `send()`). É esse desacoplamento que permite testar toda a lógica de entrar/sair/transmitir com objetos falsos, sem abrir uma conexão de rede (ver `test/unit/chat/ChannelManager.test.ts`) — o mesmo raciocínio de "porta pequena" da [Aula 06](../../Aula06/aula06.md) para `ProjectRepository`.

### `chat/webSocketHandler.ts` — o adaptador

Onde o `ws` encontra o `ChannelManager`. `WebSocketServer({ server, path: '/ws' })` não abre uma porta nova: ele se conecta ao evento `upgrade` do MESMO `http.Server` que o Express usa (ver `src/index.ts`) — por isso a ordem de montagem em `index.ts` importa. Trata três eventos por conexão: `message` (interpreta e reage ao protocolo), `close` (libera o canal e avisa quem ficou) — a leitura completa, comentário por comentário, está no próprio arquivo.

### `client/main.ts` — o navegador

Nove etapas comentadas em sequência: abrir a conexão (`ws://` x `wss://`), reagir a `open`/`message`/`close`/`error`, entrar num canal, enviar mensagens, renderizar o que o servidor manda, e uma consulta HTTP comum (`GET /api/channels`) para a lista de canais ativos — que deliberadamente NÃO usa WebSocket (ver discussão no `aulaWebSocket.md` sobre quando HTTP simples já resolve).

## Decisões de design

- **O servidor ecoa a mensagem de volta para quem a enviou** (broadcast para o canal inteiro, sem excluir o remetente). A alternativa — o cliente desenhar a própria mensagem imediatamente ("otimisticamente") e só reconciliar se o servidor discordar — é mais responsiva, mas mais complexa: o servidor continua sendo a única fonte de verdade sobre ordem e conteúdo das mensagens nesta implementação.
- **Um cliente só pode estar em um canal por vez.** Entrar num canal novo primeiro sai do atual (`ChannelManager#join` chama `leave` internamente). Trocar de canal é, por baixo, um `leave` seguido de um `join`.
- **Identidade sem autenticação.** `username` é só o que a pessoa digitou no formulário — não há verificação nenhuma (fora do escopo desta aula; ver [Aula 05](../../Aula05/aula05.md) para autenticação real). Duas pessoas podem entrar com o mesmo nome.

## Limitações desta aula (de propósito)

- **Estado só em memória de um único processo.** `ChannelManager` guarda tudo em `Map`s dentro do processo Node. Se o processo reiniciar, todos os canais e conexões somem — e se este servidor precisasse rodar em mais de uma instância atrás de um load balancer, uma mensagem mandada por alguém conectado na instância A nunca chegaria a alguém na instância B (ver "Discussão para aulas futuras" em `aulaWebSocket.md`).
- **Sem heartbeat/ping-pong.** O protocolo WebSocket tem frames de controle `ping`/`pong` justamente para detectar conexões "zumbis" (a rede caiu, mas nem cliente nem servidor perceberam ainda). Este projeto não implementa isso — é o desafio abaixo.
- **Sem reconexão automática no cliente.** Se a conexão cair, quem está usando o chat precisa recarregar a página.

## Para ir além (desafios)

- **Heartbeat**: no servidor, marcar cada conexão como "viva" a cada `pong` recebido; a cada N segundos, mandar um `ping` para todo mundo e fechar (`socket.terminate()`) quem não respondeu ao ping anterior. É o padrão descrito na [documentação do `ws`](https://github.com/websockets/ws#how-to-detect-and-close-broken-connections).
- **Reconexão no cliente**: ao receber `close`, tentar `connect()` de novo com backoff exponencial (1s, 2s, 4s...), até um limite de tentativas, atualizando o indicador de status a cada tentativa.
- **Histórico de mensagens**: hoje, quem entra num canal só vê a lista de membros (`joined`), não as mensagens anteriores. Guardar as últimas N mensagens de cada canal em `ChannelManager` e devolvê-las junto da confirmação de entrada.
- **Escalar para múltiplas instâncias**: substituir o `ChannelManager` em memória por uma versão que publica/assina mensagens via Redis (pub/sub) — mesma porta, adaptador diferente, igual à troca de `InMemoryProjectRepository` por Prisma discutida na Aula 06.
