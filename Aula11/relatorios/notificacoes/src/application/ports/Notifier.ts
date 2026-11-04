export interface Notification {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * HEXAGONAL: porta de saída. "Avise o usuário." Hoje é e-mail (Mailpit no
 * Docker, `ConsoleNotifier` nos testes); amanhã pode ser push, SMS ou
 * WebSocket (veja `AulaWebSocket/`), sem mudar o caso de uso.
 */
export interface Notifier {
  send(notification: Notification): Promise<void>;
}
