# Aula 09 — Validando requests com Zod na arquitetura hexagonal

## Objetivo

Partir do cadastro da [Aula 08](../Aula08/aula08.md) e responder a duas perguntas:

1. Como validar, de forma declarativa e tipada, o que chega pela rede? → **Zod**.
2. **Em que camada** essa validação deve morar, e como ela convive com as regras que já estão no domínio?

Na segunda parte, a listagem ganha filtro e paginação e o projeto passa a separar **escrita** de **leitura**, num **CQRS simples**. A explicação está em um documento à parte: [`cqrs.md`](cqrs.md).

## Material desta pasta

- [`cadastro/`](cadastro/): o mesmo projeto da Aula 08, agora com Zod validando os corpos das requisições, a query string e o `.env`, e com casos de uso separados em `commands/` e `queries/`.
- [`cqrs.md`](cqrs.md): material sobre CQRS simples (o problema, os níveis de CQRS, como ficou o projeto, perguntas frequentes e exercícios).

```bash
cd cadastro
cp .env.example .env
npm install
npm run dev              # http://localhost:3009
npm test
```

O [`README.md`](cadastro/README.md) do projeto lista o que mudou em relação à Aula 08, traz o roteiro de leitura do código, uma demonstração e exercícios.

Material de conceito: [`../Aula06/arquitetura-hexagonal.md`](../Aula06/arquitetura-hexagonal.md).

---

## 1. O problema: o que chega pela rede é `unknown`

No TypeScript, escrever

```ts
const { name, email } = req.body as { name: string; email: string };
```

**não valida nada**. O `as` só diz ao compilador "confie em mim". Em tempo de execução, `req.body` é o JSON que o cliente quis mandar: `{}`, `{ "name": 42 }`, `{ "email": ["a", "b"] }` ou até `{ "verified": true }`.

Os tipos do TypeScript **desaparecem** quando o código é compilado. Para saber o formato real do dado, alguém precisa olhar para ele em tempo de execução. Na Aula 08 fizemos isso à mão:

```ts
function requireStrings<K extends string>(body: unknown, keys: K[]): Record<K, string> {
  const data = (body ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    if (typeof data[key] !== 'string') {
      throw new InvalidUserDataError(`"${key}" é obrigatório e deve ser texto`);
    }
  }
  return data as Record<K, string>;   // ← ainda precisamos de um cast
}
```

Funciona, mas tem limites:

- só sabe perguntar "é string?". Tamanho máximo, formato de e-mail e "6 dígitos" seriam mais `if`s;
- para no **primeiro** erro, e o cliente precisa corrigir um campo por vez;
- os campos extras passam direto (`verified: true` chega até o caso de uso);
- o tipo do retorno é declarado por um **cast**: se a validação e o tipo divergirem, o compilador não percebe.

## 2. O que é o Zod

[Zod](https://zod.dev) é uma biblioteca de **validação de dados em tempo de execução com inferência de tipos**. Você descreve o formato esperado uma vez (o *schema*) e ganha duas coisas ao mesmo tempo:

1. uma função que **valida** um valor desconhecido;
2. um **tipo TypeScript** derivado desse mesmo schema.

```ts
import { z } from 'zod';

const registerUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
});

type RegisterUserBody = z.infer<typeof registerUserSchema>;
//   ^? { name: string; email: string }
```

### `parse` × `safeParse`

```ts
// parse: devolve o dado tipado ou LANÇA ZodError
const input = registerUserSchema.parse(req.body);

// safeParse: nunca lança; devolve um resultado para você inspecionar
const result = registerUserSchema.safeParse(req.body);
if (!result.success) {
  console.log(result.error.issues);   // [{ path: ['email'], message: '...' }, ...]
} else {
  result.data;                        // tipado
}
```

No projeto usamos `parse` nas rotas (o Express 5 encaminha a exceção ao `errorHandler`) e `safeParse` nos testes e no `config.ts`.

### As peças mais usadas

| Peça | Para quê |
| ---- | -------- |
| `z.string()`, `z.number()`, `z.boolean()` | tipos primitivos |
| `.min()`, `.max()`, `.regex()` | restrições |
| `z.email()`, `z.url()`, `z.uuid()` | formatos prontos |
| `.trim()`, `.toLowerCase()` | normalizam o valor antes de validar |
| `z.enum(['a', 'b'])` | um entre valores fixos |
| `.optional()`, `.default(x)` | campo opcional / valor padrão |
| `z.coerce.number()` | converte texto em número (útil para query string e `.env`) |
| `z.stringbool()` | converte `"true"`/`"false"`/`"1"`/`"0"` em `boolean` |
| `.transform(fn)` | transforma o resultado em outro formato |
| `z.object` / `z.strictObject` | objeto que **descarta** / **rejeita** campos desconhecidos |

> O projeto usa o **Zod 4**. Em material antigo (Zod 3) você vai ver `z.string().email()`; no Zod 4 a forma recomendada é `z.email()`.

---

## 3. Onde o Zod entra na arquitetura hexagonal

Lembrando as camadas e a regra de dependência da Aula 08:

```
     ADAPTADORES (HTTP, banco, e-mail)      ← tecnologia, bibliotecas
            │ depende de
            ▼
     APLICAÇÃO (casos de uso + portas)
            │ depende de
            ▼
     DOMÍNIO (entidades + regras de negócio) ← não depende de nada
```

O Zod é uma **biblioteca** que resolve um problema de **fronteira**: transformar um dado não confiável, vindo de fora, num dado com o formato que o núcleo espera. Por isso ele mora no **adaptador primário**, junto com o Express:

```
                         ┌──────────────── Adaptador HTTP ────────────────┐
  JSON qualquer          │                                                │
  (unknown)  ──────────▶ │  userRoutes ──▶ schemas.ts (Zod) ──┐           │
                         │                      │             │           │
                         │                ZodError → 400      │           │
                         └────────────────────────────────────┼───────────┘
                                                              │ RegisterUserInput
                                                              ▼ (tipado e bem formado)
                         ┌──────────────────── Hexágono ──────────────────┐
                         │  RegisterUser  ──▶  User.create(...)           │
                         │                        │                       │
                         │             InvalidUserDataError → 400         │
                         └────────────────────────────────────────────────┘
```

É o mesmo papel que o adaptador já tinha: **traduzir** o mundo externo para a linguagem do núcleo. O Express traduz "bytes HTTP" em "objeto JavaScript"; o Zod traduz "objeto JavaScript qualquer" em "`RegisterUserInput`".

### Quem define o contrato é o núcleo

Repare na direção da dependência no projeto:

```ts
// application/commands/RegisterUser.ts — SEM Zod
export interface RegisterUserInput {
  name: string;
  email: string;
}
```

```ts
// adapters/http/schemas.ts — o adaptador se adapta ao contrato
export const registerUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
}) satisfies z.ZodType<RegisterUserInput>;
```

O `satisfies` faz o compilador verificar que o schema produz um `RegisterUserInput`. Se alguém renomear `name` para `nome` no schema, aparece:

```
error TS1360: Type 'ZodObject<{ nome: ZodString; ... }>' does not satisfy the expected type 'ZodType<RegisterUserInput, ...>'.
  Property 'name' is missing in type '{ nome: string; email: string; }' but required in type 'RegisterUserInput'.
```

A seta continua apontando **para dentro**: o adaptador importa o tipo do caso de uso, nunca o contrário.

> **E por que não `type RegisterUserInput = z.infer<typeof registerUserSchema>` dentro do caso de uso?**
> Porque aí o caso de uso passaria a importar um arquivo do adaptador HTTP, e a seta inverteria. Se amanhã o cadastro também vier de uma fila (RabbitMQ) ou de uma CLI, cada adaptador terá seu próprio schema (os formatos de entrada podem ser diferentes), mas todos entregam o mesmo `RegisterUserInput`.

---

## 4. Formato × regra de negócio: as duas validações continuam existindo

Esta é a ideia mais importante da aula. O Zod **não substitui** as validações do domínio. São duas perguntas diferentes:

| | Validação de **formato** (Zod, adaptador) | Validação de **negócio** (domínio) |
| --- | --- | --- |
| Pergunta | "Isso tem a forma de um cadastro?" | "Esse cadastro é aceitável para o negócio?" |
| Exemplos | `name` é texto? `code` tem 6 dígitos? o corpo é JSON? tem no máximo 100 caracteres? | nome com pelo menos 2 letras; o código confere; o e-mail ainda não foi usado; usuário já verificado |
| Depende de | só do dado recebido | do dado **e** do estado do sistema (repositório, entidade) |
| Muda quando | muda o **protocolo** (HTTP, fila, CLI...) | muda a **regra do negócio** |
| Erro | `ZodError` → 400 com lista de campos | `InvalidUserDataError` etc. → 400/404/409 |

No projeto há um teste que documenta exatamente essa divisão:

```ts
test('nome com 1 letra passa no Zod: essa regra é do domínio, não do adaptador', () => {
  assert.equal(registerUserSchema.safeParse({ name: 'A', email: 'a@ifrs.edu.br' }).success, true);
});
```

E, pela API, `{ "name": "A", ... }` ainda recebe 400, mas quem barra é o `User.create()`.

### "Mas o e-mail é validado duas vezes!"

Sim, e de propósito:

- O **domínio** não pode confiar que todo mundo que o chama passou pelo Zod. Os testes chamam o caso de uso direto; um futuro adaptador de CLI ou de fila pode não ter schema nenhum. A entidade protege as próprias invariantes: **não existe `User` com e-mail inválido**, venha de onde vier.
- O **adaptador** valida para dar uma resposta boa ao cliente HTTP (todos os campos de uma vez, mensagens por campo) e para **não deixar lixo entrar** no núcleo (tipos errados, strings gigantes, campos extras).

Uma regra prática: **se a regra continuaria valendo caso a aplicação não tivesse HTTP, ela pertence ao domínio.**

### E o Zod dentro do domínio?

É uma escolha que alguns projetos fazem (usar o schema como a própria definição da entidade). O custo é que o núcleo passa a depender de uma biblioteca externa, e trocar ou atualizar o Zod (como a migração do Zod 3 para o 4) passa a mexer no domínio. Neste curso mantemos o domínio sem dependências, coerente com as Aulas 06 a 08.

---

## 5. Bônus: o `.env` também é entrada externa

O `process.env` é outra fronteira: tudo nele é `string | undefined`. Na Aula 08, `Number(process.env.SMTP_PORT)` com `SMTP_PORT=abc` virava `NaN` silenciosamente, e o erro só aparecia quando o primeiro usuário tentasse se cadastrar.

Em [`cadastro/src/config.ts`](cadastro/src/config.ts) o ambiente é validado **uma vez, na inicialização**, pela composition root:

```ts
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3009),
  EMAIL_STRATEGY: z.enum(['console', 'nodemailer']).default('console'),
});
```

```
$ EMAIL_STRATEGY=sms npm run dev
Configuração inválida no .env:
✖ Opção inválida: esperava uma das seguintes opções: "console"|"nodemailer"
  → at EMAIL_STRATEGY
```

É o princípio **fail fast**: melhor a aplicação se recusar a subir do que subir quebrada. E os adaptadores (`NodemailerEmailSender`) continuam recebendo um `SmtpConfig` pronto e tipado, sem ler `process.env`.

---

## 6. Resumo

- Tipos do TypeScript **não existem em tempo de execução**. Dado vindo de fora precisa ser validado.
- O Zod valida **e** infere o tipo a partir de um único schema.
- Na arquitetura hexagonal, o Zod é um detalhe do **adaptador**: ele traduz `unknown` no contrato que o **caso de uso define**.
- O `satisfies z.ZodType<Contrato>` mantém a seta de dependência apontando para dentro e faz o compilador vigiar a tradução.
- **Formato** fica no adaptador; **regra de negócio** fica no domínio. As duas validações coexistem.
- A mesma ideia vale para qualquer fronteira: `req.body`, `req.query`, `req.params`, `.env`, respostas de APIs externas, mensagens de filas.

## 7. Segunda parte: CQRS simples

Com a validação resolvida, a aula segue para o `GET /users?verified=true&page=2&pageSize=5`. Para atender esse requisito sem inchar o `UserRepository`, o projeto separa **commands** (escrita, passam pelo domínio) de **queries** (leitura, devolvem DTOs prontos) e dá a cada lado a sua porta. O Zod reaparece validando a query string.

Leia [`cqrs.md`](cqrs.md).

## Para discutir em aula

1. Um cliente manda `"name": "   "` (só espaços). Quem barra: Zod ou domínio? Mude o schema para `min(2)`. Agora quem barra? Qual das duas versões você prefere e por quê?
2. O código de verificação ter 6 dígitos é formato ou regra de negócio? E se amanhã o negócio decidir usar códigos de 8 caracteres alfanuméricos, quantos arquivos mudam?
3. Se o cadastro passar a chegar também por uma fila de mensagens, o que precisa ser escrito de novo e o que é reaproveitado?
