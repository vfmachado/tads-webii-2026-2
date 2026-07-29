/**
 * Erro de domínio: fala a língua do negócio ("CPF inválido"), não a
 * língua do algoritmo ("dígito verificador incorreto"). É esse tipo de
 * erro que aparece nos TESTES DE DOMÍNIO.
 */
export class InvalidCpfError extends Error {
  constructor(rawValue: string) {
    super(`"${rawValue}" não é um CPF válido.`);
    this.name = 'InvalidCpfError';
  }
}
