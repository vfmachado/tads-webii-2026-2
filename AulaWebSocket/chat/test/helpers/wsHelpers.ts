import type { WebSocket } from 'ws';

/**
 * Helpers só para os testes de e2e: transformam os eventos do `ws`
 * (baseados em callback) em Promises, para poder usar `await` num teste
 * sequencial em vez de aninhar `.on(...)` manualmente.
 */
export function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => socket.once('open', () => resolve()));
}

export function waitForMessage(socket: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => {
      try {
        resolve(JSON.parse(data.toString()));
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * O inverso de `waitForMessage`: resolve se NENHUMA mensagem chegar dentro
 * de `ms` — usado para provar que canais diferentes não vazam mensagens
 * entre si. Se uma mensagem chegar antes do tempo, o teste falha.
 */
export function expectNoMessage(socket: WebSocket, ms = 200): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    socket.once('message', (data) => {
      clearTimeout(timer);
      reject(new Error(`Mensagem inesperada recebida: ${data.toString()}`));
    });
  });
}
