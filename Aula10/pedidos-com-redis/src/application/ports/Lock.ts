/**
 * HEXAGONAL: porta de saída para EXCLUSÃO MÚTUA. O caso de uso diz "só um
 * por vez para esta chave" sem saber COMO isso é garantido.
 *
 * O adaptador usado na aula é o `RedisLock`. Como o Redis é um serviço
 * separado, o lock vale para TODAS as instâncias da API que falam com o
 * mesmo Redis — algo que um mutex em memória não consegue.
 */
export interface Lock {
  /**
   * Espera até conseguir o lock de `key`, executa `fn` e libera o lock
   * (mesmo que `fn` lance um erro).
   */
  withLock<T>(key: string, fn: () => Promise<T>): Promise<T>;
}

/** Não foi possível obter o lock dentro do tempo de espera. */
export class LockTimeoutError extends Error {
  constructor(key: string) {
    super(`O recurso "${key}" está ocupado; tente novamente em instantes`);
  }
}
