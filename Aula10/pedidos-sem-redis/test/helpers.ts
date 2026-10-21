import type { AddressInfo } from 'node:net';
import { createApp, type AppOptions } from '../src/app.js';

/** Sobe a aplicação numa porta livre e devolve a URL base. */
export async function startApp(options: AppOptions = {}): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const { app } = createApp({ log: false, ...options });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://localhost:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** Dispara `count` pedidos AO MESMO TEMPO e conta as respostas por status. */
export async function fireConcurrentOrders(baseUrl: string, productId: string, count: number) {
  const responses = await Promise.all(
    Array.from({ length: count }, () =>
      fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      }),
    ),
  );
  return {
    created: responses.filter((r) => r.status === 201).length,
    rejected: responses.filter((r) => r.status === 409).length,
  };
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}
