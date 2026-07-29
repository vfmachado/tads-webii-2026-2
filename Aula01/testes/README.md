# Testes unitários x testes de domínio — validação de CPF

Exemplo de apoio para a Aula 01, usado para discutir a diferença entre **teste unitário** e **teste de domínio** a partir de um caso concreto: validar um CPF.

## Estrutura

```
testes/
├── src/cpf/
│   ├── cpfAlgorithm.ts   → funções puras: só sabem fazer a conta do dígito verificador
│   ├── errors.ts         → InvalidCpfError: erro que fala a língua do negócio
│   └── Cpf.ts            → Objeto de Valor: protege o invariante "todo Cpf é válido"
└── test/
    ├── unit/cpfAlgorithm.test.ts   → TESTES UNITÁRIOS
    └── domain/Cpf.test.ts          → TESTES DE DOMÍNIO
```

## A diferença na prática

**Teste unitário** (`test/unit/cpfAlgorithm.test.ts`): testa o algoritmo isolado — soma ponderada, cálculo do dígito verificador, remoção de máscara. Pergunta "a conta está certa?". Rápido, muitos casos de borda, zero conhecimento de negócio.

**Teste de domínio** (`test/domain/Cpf.test.ts`): testa o conceito `Cpf` como um Objeto de Valor. Pergunta "esse conceito se comporta como o negócio espera?" — nunca existe um `Cpf` inválido, o erro fala a língua do negócio (`InvalidCpfError`), e a igualdade é por valor (dois `Cpf` criados de formas diferentes, mas com o mesmo número, são iguais).

Repare que o teste de domínio **não recalcula a matemática** — ele já confia que o algoritmo está correto (isso é papel do teste unitário) e foca em como o conceito de negócio se comporta.

## Rodando

```bash
npm install
npm test          # roda os dois conjuntos
npm run test:unit    # só os testes unitários
npm run test:domain  # só os testes de domínio
```

## Perguntas para a aula

1. Por que colocar a validação dentro de um construtor privado (`Cpf.create`), em vez de deixar qualquer código montar um `Cpf` com `new Cpf(valor)`?
2. O que aconteceria com o resto do sistema se um `Cpf` inválido conseguisse existir?
3. Se amanhã a regra de negócio mudar (por exemplo, aceitar CPF de teste em ambiente de homologação), qual teste muda: o unitário, o de domínio, ou os dois?
4. Vale a pena testar a mesma regra duas vezes (uma no algoritmo, outra no domínio)? O que cada teste garante que o outro não garante?
