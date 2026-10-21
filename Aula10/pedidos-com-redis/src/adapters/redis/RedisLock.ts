import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { LockTimeoutError, type Lock } from '../../application/ports/Lock.js';
import type { RedisClient } from './redisClient.js';

export interface RedisLockOptions {
  /** Validade do lock. Se a API cair segurando o lock, ele expira sozinho. */
  ttlMs: number;
  /** Quanto tempo esperar pelo lock antes de desistir. */
  waitTimeoutMs: number;
  /** Intervalo entre as tentativas. */
  retryDelayMs: number;
}

/**
 * Libera o lock SÓ se ele ainda for nosso. GET + DEL precisam ser uma
 * operação única: o Redis executa um script Lua inteiro sem intercalar
 * nenhum outro comando.
 */
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

/**
 * HEXAGONAL: adaptador secundário da porta `Lock`, usando Redis.
 *
 * Adquirir:  SET lock:product:camiseta <token> NX PX 5000
 *   - NX: só grava se a chave NÃO existir. O Redis executa um comando por
 *     vez, então entre 20 requisições simultâneas exatamente UMA recebe "OK";
 *     as outras recebem null e tentam de novo daqui a pouco.
 *   - PX 5000: a chave expira em 5 s. Sem isso, uma API que travasse com
 *     o lock na mão bloquearia o produto para sempre.
 *   - token: um valor aleatório, para que cada um só libere o PRÓPRIO lock.
 *
 * Liberar: o script Lua acima (compara o token e apaga).
 */
export class RedisLock implements Lock {
  constructor(
    private readonly redis: RedisClient,
    private readonly options: RedisLockOptions = { ttlMs: 5000, waitTimeoutMs: 10000, retryDelayMs: 25 },
    private readonly log = true,
  ) {}

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const token = randomUUID();
    await this.acquire(key, token);
    try {
      return await fn();
    } finally {
      await this.redis.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
      if (this.log) {
        console.log(`[lock] liberado ${key}`);
      }
    }
  }

  private async acquire(key: string, token: string): Promise<void> {
    const deadline = Date.now() + this.options.waitTimeoutMs;
    while (true) {
      const result = await this.redis.set(key, token, {
        condition: 'NX',
        expiration: { type: 'PX', value: this.options.ttlMs },
      });
      if (result === 'OK') {
        if (this.log) {
          console.log(`[lock] adquirido ${key}`);
        }
        return;
      }
      if (Date.now() >= deadline) {
        throw new LockTimeoutError(key);
      }
      await sleep(this.options.retryDelayMs);
    }
  }
}
