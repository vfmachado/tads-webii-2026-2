import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listUsersQuerySchema, registerUserSchema, verifyUserSchema } from '../src/adapters/http/schemas.js';

// Os schemas são funções puras: dá para testá-los sem Express e sem HTTP.
function failedFields(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

test('cadastro: aceita um corpo válido e remove espaços do nome', () => {
  const input = registerUserSchema.parse({ name: '  Ana  ', email: 'ana@ifrs.edu.br' });
  assert.deepEqual(input, { name: 'Ana', email: 'ana@ifrs.edu.br' });
});

test('cadastro: aponta todos os campos inválidos de uma vez', () => {
  const result = registerUserSchema.safeParse({ name: 42, email: 'sem-arroba' });
  assert.equal(result.success, false);
  assert.deepEqual(failedFields(result), ['name', 'email']);
});

test('cadastro: descarta campos que não fazem parte do contrato', () => {
  // Proteção contra "mass assignment": o cliente não consegue se marcar como verificado.
  const input = registerUserSchema.parse({ name: 'Ana', email: 'ana@ifrs.edu.br', verified: true });
  assert.equal('verified' in input, false);
});

test('verificação: o código precisa ter exatamente 6 dígitos', () => {
  assert.equal(verifyUserSchema.safeParse({ email: 'ana@ifrs.edu.br', code: '123456' }).success, true);
  assert.deepEqual(failedFields(verifyUserSchema.safeParse({ email: 'ana@ifrs.edu.br', code: '12a' })), ['code']);
  assert.deepEqual(failedFields(verifyUserSchema.safeParse({ email: 'ana@ifrs.edu.br', code: 123456 })), ['code']);
});

test('nome com 1 letra passa no Zod: essa regra é do domínio, não do adaptador', () => {
  assert.equal(registerUserSchema.safeParse({ name: 'A', email: 'a@ifrs.edu.br' }).success, true);
});

test('query string: converte texto em número/boolean e aplica os padrões', () => {
  assert.deepEqual(listUsersQuerySchema.parse({}), { page: 1, pageSize: 10 });
  assert.deepEqual(listUsersQuerySchema.parse({ verified: 'false', page: '3', pageSize: '5' }), {
    verified: false,
    page: 3,
    pageSize: 5,
  });
  assert.deepEqual(failedFields(listUsersQuerySchema.safeParse({ page: '0', pageSize: '1000' })), ['page', 'pageSize']);
});
