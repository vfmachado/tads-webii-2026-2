/**
 * Algoritmo puro de validação de CPF (Cadastro de Pessoas Físicas).
 *
 * Este arquivo NÃO sabe nada sobre "domínio de negócio" — não tem regra
 * de "CPF é obrigatório para clientes" nem lança erros com significado
 * de negócio. Ele só sabe fazer a conta. É o alvo dos TESTES UNITÁRIOS.
 */

/** Remove tudo que não for dígito (pontos, traço, espaços). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** CPFs como "000.000.000-00" ou "111.111.111-11" passam na conta do dígito
 * verificador, mas nunca foram emitidos — precisam ser rejeitados à parte. */
export function hasAllSameDigits(digits: string): boolean {
  return /^(\d)\1{10}$/.test(digits);
}

/**
 * Calcula um dígito verificador do CPF.
 *
 * `factorStart` é o peso do primeiro dígito da sequência (10 para o
 * primeiro dígito verificador, 11 para o segundo); o peso decresce 1 a 1.
 */
export function calculateCheckDigit(digits: string, factorStart: number): number {
  let sum = 0;
  let factor = factorStart;

  for (const digit of digits) {
    sum += Number(digit) * factor;
    factor -= 1;
  }

  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Valida um CPF (aceita com ou sem máscara).
 * Retorna `false` para qualquer entrada que não seja um CPF real:
 * tamanho errado, sequência repetida ou dígitos verificadores incorretos.
 */
export function isValidCpf(rawValue: string): boolean {
  const digits = onlyDigits(rawValue);

  if (digits.length !== 11) return false;
  if (hasAllSameDigits(digits)) return false;

  const firstNine = digits.slice(0, 9);
  const firstCheckDigit = calculateCheckDigit(firstNine, 10);
  const firstTen = firstNine + firstCheckDigit;
  const secondCheckDigit = calculateCheckDigit(firstTen, 11);

  return digits === `${firstTen}${secondCheckDigit}`;
}

/** Formata 11 dígitos como "000.000.000-00". Não valida — só formata. */
export function formatCpf(digits: string): string {
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
