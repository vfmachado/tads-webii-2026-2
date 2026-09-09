# AulaWebSocket — Comunicação em tempo real com WebSocket

## Objetivo

Entender o protocolo WebSocket (o que ele é, como o handshake funciona, em que ele difere de HTTP request/response) e aplicá-lo na prática construindo um chat em tempo real organizado por canais — com um servidor Node que mantém conexões abertas e um frontend que reage a mensagens empurradas pelo servidor, sem polling. Ao final da aula, o estudante deve saber decidir, para um requisito dado, se WebSocket é a ferramenta certa ou se HTTP comum (com ou sem polling) já resolveria com menos complexidade.


---

## O que é WebSocket

WebSocket é um protocolo (definido na [RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)) que estabelece um canal de comunicação **full-duplex** (as duas pontas podem enviar a qualquer momento, sem esperar a vez) sobre uma única conexão **TCP de longa duração**. Ele nasce de dentro do HTTP — começa como uma requisição HTTP normal — e depois "muda de protocolo" para algo bem mais leve que HTTP.

### O handshake: como uma requisição HTTP vira um WebSocket

1. O cliente (navegador) faz uma requisição `GET` normal, mas com cabeçalhos especiais:
   ```
   GET /ws HTTP/1.1
   Host: exemplo.com
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   ```
2. Se o servidor sabe falar WebSocket naquela rota, ele responde `101 Switching Protocols` (em vez de `200 OK`) com um `Sec-WebSocket-Accept` calculado a partir da chave enviada — prova de que o servidor realmente entendeu o pedido de upgrade (e não é, por exemplo, um proxy HTTP comum devolvendo qualquer coisa).
3. A partir daí, a MESMA conexão TCP deixa de falar HTTP. Não existem mais métodos, rotas, nem um par requisição/resposta por mensagem — o que passa a trafegar são **frames** WebSocket, um formato binário compacto (poucos bytes de cabeçalho) que carrega texto ou dados binários em qualquer direção, a qualquer momento.

Isso é o que o código deste projeto explora em [`chat/src/chat/webSocketHandler.ts`](chat/src/chat/webSocketHandler.ts): a biblioteca `ws` se conecta ao evento `upgrade` do mesmo servidor HTTP que o Express usa para tudo mais — ver o comentário no topo daquele arquivo.

### Ciclo de vida de uma conexão

No navegador, um objeto `WebSocket` tem um `readyState` que passa por quatro estados: `CONNECTING` (0, durante o handshake) → `OPEN` (1, pronto para enviar/receber) → `CLOSING` (2) → `CLOSED` (3). Os eventos que o código escuta (`open`, `message`, `close`, `error`) marcam essas transições — ver `chat/src/client/main.ts`, etapas 1 a 5.

Diferente de uma requisição HTTP (que começa, termina, e "esquece" o cliente), uma conexão WebSocket **persiste** — pode ficar aberta minutos, horas, o tempo que o navegador (ou o servidor) permitir. Isso muda o modelo mental: em vez de "pergunta e resposta", é "conversa contínua".

### Por que isso é mais barato que ficar perguntando (polling)?

Sem WebSocket, "tempo real" no navegador normalmente significa **polling**: `fetch('/api/mensagens')` a cada N segundos, perguntando "tem mensagem nova?". Cada pergunta é uma requisição HTTP completa — cabeçalhos, handshake TLS (se https), overhead de conexão — mesmo quando a resposta é "não, nada mudou". Um **long polling** melhora isso um pouco (o servidor segura a resposta até ter algo novo ou um timeout), mas ainda reabre uma requisição HTTP a cada ciclo.

Com WebSocket, o handshake acontece **uma vez**; depois disso, tanto cliente quanto servidor podem mandar uma mensagem a qualquer momento, com pouquíssimo overhead por mensagem. O ganho é maior quanto mais mensagens trafegam ao longo da vida da conexão — para uma única troca isolada, o WebSocket não é "mais rápido": o custo do handshake inicial só se paga quando há troca repetida.

---

## Onde WebSocket é uma boa escolha

A pergunta certa não é "isso é tempo real?", é: **"as duas pontas precisam iniciar o envio, com frequência, e a latência importa?"**

- **Chat e mensageria instantânea** — o exemplo desta aula. Qualquer participante pode mandar uma mensagem a qualquer momento; todos os outros precisam receber em milissegundos.
- **Notificações ao vivo** empurradas pelo servidor (ex.: "fulano comentou no seu post agora").
- **Colaboração em tempo real** — cursores de outros usuários num editor tipo Google Docs, quadros colaborativos (Figma, Miro).
- **Jogos multiplayer casuais** (baixa exigência de latência extrema, ao contrário de jogos competitivos que usam UDP).
- **Dashboards com dado que muda o tempo todo** — cotação de ações, telemetria de um sistema, posição de um veículo em um mapa ao vivo.
- **Presença** — "quem está online agora" precisa ser atualizado dos dois lados o tempo todo.

O padrão comum: **push do servidor + múltiplas mensagens ao longo do tempo + baixa latência importa**.

## Onde WebSocket é usado erroneamente

1. **Substituindo uma API REST/CRUD comum.** Se a interação é "peço um dado, recebo uma resposta, acabou" (ex.: `GET /usuarios/42`, `POST /pedidos`), HTTP comum já resolve — e resolve melhor: você ganha cache HTTP, CDN, códigos de status semânticos, retries mais simples, e infraestrutura de load balancer madura para request/response. Trocar isso por WebSocket "porque é mais moderno" joga fora tudo isso sem ganhar nada em troca.
2. **Para dados que mudam raramente.** Um painel que atualiza uma vez por hora não precisa de uma conexão persistente 24/7 — um `fetch` periódico (ou nem isso) é mais simples de operar e escalar.
3. **Como substituto de fila de mensagens confiável.** WebSocket não garante entrega, não persiste mensagens, não tem replay: se a conexão cair no meio, o que estava em trânsito se perde. Para "essa mensagem TEM que chegar, mesmo que o consumidor esteja offline agora", o que se quer é uma fila/broker (RabbitMQ, Kafka — tema da Aula 9), não um socket aberto.
4. **Quando push unidirecional simples bastaria.** Se só o SERVIDOR precisa empurrar dados (o cliente nunca inicia envio), **Server-Sent Events (SSE)** é mais simples: roda sobre HTTP comum, o navegador reconecta sozinho automaticamente, atravessa proxies/CDNs que já entendem HTTP, e não exige uma biblioteca como o `ws` no servidor. WebSocket só se justifica quando as DUAS pontas precisam iniciar o envio.
5. **Guardando estado de negócio importante só na memória da conexão** — exatamente a limitação que o `ChannelManager` deste projeto tem de propósito (ver "Limitações desta aula" abaixo): se o processo cair, os canais e quem estava neles somem. Ok para um chat de aula; não para nada que precise sobreviver a um restart ou rodar em mais de uma instância sem coordenação extra.
6. **Sem heartbeat/reconexão**, o que gera conexões "zumbis" (o servidor acha que o cliente ainda está lá, mas a rede já caiu silenciosamente) e clientes que nunca percebem que perderam a conexão. Ver "Para ir além" no README do projeto.

### Tabela-resumo: WebSocket x alternativas

| Necessidade | Melhor opção | Por quê |
| --- | --- | --- |
| Pedir um dado pontual | HTTP normal | Cache, status codes, simplicidade, infraestrutura madura |
| Servidor empurra, cliente só escuta | Server-Sent Events (SSE) | Mais simples que WebSocket, reconecta sozinho, sobre HTTP comum |
| As duas pontas iniciam envio, com frequência, latência importa | WebSocket | Handshake único, overhead mínimo por mensagem, full-duplex |
| Mensagem PRECISA chegar, mesmo com consumidor offline | Fila/broker (RabbitMQ, Kafka) | Persistência, garantias de entrega, replay — WebSocket não tem nada disso |

---

## Conteúdos

* Protocolo WebSocket: handshake (upgrade de HTTP), frames, full-duplex, estados da conexão (`CONNECTING`/`OPEN`/`CLOSING`/`CLOSED`).
* WebSocket x HTTP polling x long polling x Server-Sent Events — o que cada um resolve e a que custo.
* Onde WebSocket é a ferramenta certa e onde ele é usado por modismo em vez de necessidade real (ver seções acima).
* Protocolo de aplicação por cima do WebSocket: como definir um formato de mensagem próprio (`{ type, ... }`) quando o transporte só entende bytes.
* Canais/salas: como um servidor organiza múltiplas conversas simultâneas sobre o mesmo conjunto de conexões.
* Ciclo de vida de uma conexão: abrir, trocar mensagens, fechar (de propósito ou por queda de rede) — e por que isso é fundamentalmente diferente do ciclo pedido/resposta do HTTP.
* Limitações práticas de manter estado em memória de processo (o que quebra ao escalar para múltiplas instâncias).

## Material desta pasta

Um projeto completo: [`chat/`](chat/), um chat em tempo real por canais.

```bash
cd chat
npm install
npm test               # suíte completa (unit + e2e com sockets reais)
npm run test:coverage   # 100% de cobertura no código do servidor
npm run dev              # compila o cliente e sobe http://localhost:3005
```

Abram duas abas (ou dois navegadores) em `http://localhost:3005`, entrem no MESMO canal com nomes diferentes, e conversem — depois abram uma terceira aba num canal DIFERENTE e reparem que ela não recebe as mensagens das outras duas. O [`README.md`](chat/README.md) do projeto tem um tour completo pelo código (protocolo, gerenciamento de canais, adaptador WebSocket, cliente) e a explicação de cada decisão de design.

## Atividade em sala

1. Abrir as ferramentas de desenvolvedor do navegador (aba Network, filtro "WS") ao entrar em `http://localhost:3005` e localizar a requisição de upgrade — ver os cabeçalhos `Upgrade`/`Connection`/`Sec-WebSocket-*` e a resposta `101 Switching Protocols`. Depois, ver os frames trocados (a maioria dos navegadores mostra isso na mesma aba).
2. Reproduzir o cenário de dois canais: abrir 3 abas, duas no canal `geral` e uma no canal `dev`; mandar mensagens e confirmar que só quem está no mesmo canal recebe.
3. Ler [`chat/src/chat/webSocketHandler.ts`](chat/src/chat/webSocketHandler.ts) e apontar, no código, onde cada etapa do ciclo de vida (`connection`, `message`, `close`) é tratada.
4. Debate em grupo: para cada um dos usos na seção "Onde WebSocket é usado erroneamente", dar um exemplo concreto (de um app que os estudantes usam) que se encaixa ali — e qual seria a alternativa mais adequada.
5. Desafio (estica): implementar heartbeat (ping/pong) no servidor para detectar conexões "zumbis" — descrito na seção "Para ir além" do README do projeto.

## Discussão para aulas futuras

Guardem a pergunta: o `ChannelManager` deste projeto guarda tudo em memória de um único processo Node. O que quebra se esse servidor precisar rodar em duas instâncias atrás de um load balancer (uma mensagem mandada por alguém conectado na instância A precisa chegar a alguém conectado na instância B)? A resposta usual — um broker de mensagens compartilhado entre as instâncias (Redis pub/sub, RabbitMQ) — conecta diretamente com a Aula 9 do planejamento (mensageria e arquitetura orientada a eventos).
