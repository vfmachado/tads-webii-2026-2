/**
 * HEXAGONAL: porta de saída para gerar o código de verificação.
 *
 * Por que uma porta para algo tão simples? Porque aleatoriedade é um
 * detalhe externo que atrapalha testes: com esta interface, o teste
 * injeta um gerador que sempre devolve "123456" e sabe qual código usar.
 */
export interface CodeGenerator {
  generate(): string;
}
