import { describe, expect, it } from 'vitest';
import {
  calculateCheckDigit,
  formatCpf,
  hasAllSameDigits,
  isValidCpf,
  onlyDigits,
} from '../../src/cpf/cpfAlgorithm.js';

/**
 * TESTES UNITÁRIOS
 *
 * Aqui testamos o ALGORITMO isolado: matemática de dígito verificador,
 * limpeza de string, formatação. Não há nenhuma noção de "regra de
 * negócio" — só entrada e saída de funções puras. É o nível de teste
 * mais rápido, mais barato e com a maior cobertura de casos possível.
 */

describe('onlyDigits', () => {
  it('remove pontuação e mantém apenas os dígitos', () => {
    expect(onlyDigits('529.982.247-25')).toBe('52998224725');
  });

  it('não altera uma string que já é só dígitos', () => {
    expect(onlyDigits('52998224725')).toBe('52998224725');
  });
});

describe('hasAllSameDigits', () => {
  it('identifica sequências com os 11 dígitos repetidos', () => {
    expect(hasAllSameDigits('00000000000')).toBe(true);
    expect(hasAllSameDigits('11111111111')).toBe(true);
    expect(hasAllSameDigits('99999999999')).toBe(true);
  });

  it('não marca uma sequência normal como repetida', () => {
    expect(hasAllSameDigits('52998224725')).toBe(false);
  });
});

describe('calculateCheckDigit', () => {
  it('calcula o primeiro dígito verificador (peso inicial 10)', () => {
    expect(calculateCheckDigit('529982247', 10)).toBe(2);
  });

  it('calcula o segundo dígito verificador (peso inicial 11)', () => {
    expect(calculateCheckDigit('5299822472', 11)).toBe(5);
  });
});

describe('isValidCpf', () => {
  it('aceita um CPF válido sem máscara', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('aceita o mesmo CPF válido com máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF com dígito verificador incorreto', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false);
  });

  it('rejeita sequência com todos os dígitos iguais', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('rejeita entrada com tamanho errado', () => {
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('123456789012')).toBe(false);
  });

  it('rejeita string vazia ou só com pontuação', () => {
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf('...-')).toBe(false);
  });
});

describe('formatCpf', () => {
  it('formata 11 dígitos no padrão 000.000.000-00', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});
