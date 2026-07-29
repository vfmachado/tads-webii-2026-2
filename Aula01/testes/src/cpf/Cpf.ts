import { formatCpf, isValidCpf, onlyDigits } from './cpfAlgorithm.js';
import { InvalidCpfError } from './errors.js';

/**
 * Cpf é um Objeto de Valor (Value Object): não tem identidade própria,
 * é definido inteiramente pelo seu conteúdo, e — o ponto mais importante
 * para a aula — é IMPOSSÍVEL existir uma instância de Cpf inválida.
 *
 * O construtor é privado de propósito: a única forma de criar um Cpf é
 * pelo método `create`, que protege esse invariante. Isso é o que
 * diferencia um TESTE DE DOMÍNIO de um teste de algoritmo: aqui não
 * estamos testando "a conta do dígito verificador está certa?", estamos
 * testando "esse conceito de negócio se comporta como deveria?".
 */
export class Cpf {
  private constructor(private readonly digits: string) {}

  static create(rawValue: string): Cpf {
    if (!isValidCpf(rawValue)) {
      throw new InvalidCpfError(rawValue);
    }

    return new Cpf(onlyDigits(rawValue));
  }

  /** Dois CPFs são "iguais" se representam o mesmo número — não importa
   * se um veio formatado e o outro não. Igualdade por valor, não por referência. */
  equals(other: Cpf): boolean {
    return this.digits === other.digits;
  }

  toFormatted(): string {
    return formatCpf(this.digits);
  }

  /** Representação "crua", sem máscara — útil para persistência/comparação. */
  toString(): string {
    return this.digits;
  }
}
