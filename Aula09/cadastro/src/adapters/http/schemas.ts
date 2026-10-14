import { z } from 'zod';
import type { RegisterUserInput } from '../../application/commands/RegisterUser.js';
import type { VerifyUserInput } from '../../application/commands/VerifyUser.js';
import type { ListUsersInput } from '../../application/queries/ListUsers.js';

/**
 * HEXAGONAL: schemas de REQUISIÇÃO do adaptador primário HTTP.
 *
 * O Zod mora aqui, na borda do hexágono, porque o problema que ele
 * resolve é de borda: o `req.body` chega como `unknown` (qualquer JSON
 * que o cliente quiser mandar) e precisa virar um objeto com o formato
 * que o caso de uso espera.
 *
 * O que fica aqui é FORMATO (tipo, campo obrigatório, tamanho máximo,
 * cara de e-mail, 6 dígitos). Regras de NEGÓCIO (nome com pelo menos 2
 * letras, código correto, e-mail não repetido) continuam no domínio e
 * nos casos de uso.
 *
 * O `satisfies z.ZodType<...>` faz o compilador conferir que o schema
 * produz exatamente o contrato definido pelo caso de uso. Se alguém
 * adicionar um campo ao `RegisterUserInput`, este arquivo deixa de
 * compilar — o adaptador se adapta ao núcleo, nunca o contrário.
 */
export const registerUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
}) satisfies z.ZodType<RegisterUserInput>;

export const verifyUserSchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/, 'O código deve ter 6 dígitos'),
}) satisfies z.ZodType<VerifyUserInput>;

/**
 * CQRS: schema da QUERY STRING de `GET /users`. Tudo em `req.query` chega
 * como texto, por isso `z.coerce.number()` e `z.stringbool()`:
 *   GET /users?verified=true&page=2&pageSize=5
 * O limite de `pageSize` protege o servidor de um `pageSize=1000000`.
 */
export const listUsersQuerySchema = z.object({
  verified: z.stringbool().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
}) satisfies z.ZodType<ListUsersInput>;
