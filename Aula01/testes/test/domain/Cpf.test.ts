import { describe, expect, it } from 'vitest';
import { Cpf } from '../../src/cpf/Cpf.js';
import { InvalidCpfError } from '../../src/cpf/errors.js';

/**
 * TESTES DE DOMÍNIO
 *
 * Aqui não testamos mais "a conta está certa?" — isso já foi garantido
 * pelos testes unitários do algoritmo. Testamos se o CONCEITO DE NEGÓCIO
 * "Cpf" se comporta como um Objeto de Valor deveria:
 *
 *  1. Protege seu próprio invariante (nunca existe em estado inválido).
 *  2. Fala a língua do negócio nos erros (InvalidCpfError, não "checksum failed").
 *  3. Tem igualdade por valor, não por referência.
 *  4. Expõe apenas os comportamentos que fazem sentido para quem usa o domínio
 *     (formatar, comparar) — não expõe os detalhes do algoritmo.
 */

describe('Cpf.create', () => {
  it('cria um Cpf a partir de um número válido, com ou sem máscara', () => {
    const semMascara = Cpf.create('52998224725');
    const comMascara = Cpf.create('529.982.247-25');

    expect(semMascara.toFormatted()).toBe('529.982.247-25');
    expect(comMascara.toFormatted()).toBe('529.982.247-25');
  });

  it('nunca permite a existência de um Cpf inválido', () => {
    expect(() => Cpf.create('111.111.111-11')).toThrow(InvalidCpfError);
    expect(() => Cpf.create('529.982.247-26')).toThrow(InvalidCpfError);
    expect(() => Cpf.create('não é um cpf')).toThrow(InvalidCpfError);
  });

  it('comunica o erro na língua do domínio, não do algoritmo', () => {
    try {
      Cpf.create('123');
      expect.fail('deveria ter lançado InvalidCpfError');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCpfError);
      expect((error as Error).message).toContain('não é um CPF válido');
    }
  });
});

describe('Cpf#equals', () => {
  it('considera dois CPFs iguais quando representam o mesmo número', () => {
    const a = Cpf.create('529.982.247-25');
    const b = Cpf.create('52998224725');

    expect(a.equals(b)).toBe(true);
  });

  it('considera CPFs diferentes como não iguais', () => {
    const a = Cpf.create('529.982.247-25');
    const b = Cpf.create('111.444.777-35');

    expect(a.equals(b)).toBe(false);
  });
});

describe('Cpf#toString', () => {
  it('expõe a representação crua (sem máscara), útil para persistência', () => {
    const cpf = Cpf.create('529.982.247-25');
    expect(cpf.toString()).toBe('52998224725');
  });
});
