import type { Notification, Notifier } from '../../application/ports/Notifier.js';

/** Para rodar sem SMTP: só imprime o aviso no terminal. */
export class ConsoleNotifier implements Notifier {
  async send(notification: Notification): Promise<void> {
    console.log(`[email:console] para ${notification.to}\n  ${notification.subject}\n  ${notification.text.replaceAll('\n', '\n  ')}`);
  }
}
