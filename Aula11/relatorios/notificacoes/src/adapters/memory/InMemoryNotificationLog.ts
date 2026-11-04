import type { NotificationLog } from '../../application/ports/NotificationLog.js';

/**
 * Em memória: reiniciou o serviço, esqueceu o que enviou. Em produção, um
 * `SET key 1 NX EX 604800` no Redis (Aula 10) faria o mesmo papel, valendo
 * para todas as réplicas.
 */
export class InMemoryNotificationLog implements NotificationLog {
  private readonly keys = new Set<string>();

  async markAsSent(key: string): Promise<boolean> {
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    return true;
  }

  async unmark(key: string): Promise<void> {
    this.keys.delete(key);
  }
}
