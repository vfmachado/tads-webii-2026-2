import { randomInt } from 'node:crypto';
import type { CodeGenerator } from '../../application/ports/CodeGenerator.js';

/**
 * HEXAGONAL: adaptador secundário. Gera um código numérico de 6 dígitos
 * com `node:crypto` (criptograficamente seguro, ao contrário de
 * `Math.random`).
 */
export class RandomCodeGenerator implements CodeGenerator {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
