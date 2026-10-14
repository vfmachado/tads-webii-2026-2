import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RegisterUser } from '../src/application/commands/RegisterUser.js';
import { VerifyUser } from '../src/application/commands/VerifyUser.js';
import type { EmailSender } from '../src/application/ports/EmailSender.js';
import { ListUsers } from '../src/application/queries/ListUsers.js';
import { InMemoryDatabase } from '../src/adapters/memory/InMemoryDatabase.js';
import { InMemoryUserRepository } from '../src/adapters/memory/InMemoryUserRepository.js';
import { InMemoryUserQueries } from '../src/adapters/memory/InMemoryUserQueries.js';
import { EmailAlreadyRegisteredError, InvalidVerificationCodeError } from '../src/domain/errors.js';

// Dublês das portas: sem SMTP, sem aleatoriedade, sem HTTP.
const fixedCode = { generate: () => '123456' };

class SpyEmailSender implements EmailSender {
  sent: { email: string; code: string }[] = [];
  async sendVerificationCode(to: { email: string }, code: string): Promise<void> {
    this.sent.push({ email: to.email, code });
  }
}

function setup() {
  const db = new InMemoryDatabase();
  const users = new InMemoryUserRepository(db);
  const email = new SpyEmailSender();
  return {
    email,
    register: new RegisterUser(users, email, fixedCode),
    verify: new VerifyUser(users),
    list: new ListUsers(new InMemoryUserQueries(db)),
  };
}

test('cadastro envia o código por e-mail e o usuário começa não verificado', async () => {
  const { register, email } = setup();
  const user = await register.execute({ name: 'Ana', email: 'ana@ifrs.edu.br' });

  assert.equal(user.verified, false);
  assert.deepEqual(email.sent, [{ email: 'ana@ifrs.edu.br', code: '123456' }]);
});

test('não permite cadastrar o mesmo e-mail duas vezes', async () => {
  const { register } = setup();
  await register.execute({ name: 'Ana', email: 'ana@ifrs.edu.br' });

  await assert.rejects(register.execute({ name: 'Ana 2', email: 'ANA@ifrs.edu.br' }), EmailAlreadyRegisteredError);
});

test('verifica com o código correto e rejeita o incorreto', async () => {
  const { register, verify } = setup();
  await register.execute({ name: 'Ana', email: 'ana@ifrs.edu.br' });

  await assert.rejects(verify.execute({ email: 'ana@ifrs.edu.br', code: '000000' }), InvalidVerificationCodeError);
  const result = await verify.execute({ email: 'ana@ifrs.edu.br', code: '123456' });
  assert.equal(result.verified, true);
});

// --- CQRS: o que os commands gravam, a query enxerga (mesmo armazenamento) ---

test('query lista em ordem alfabética, com filtro por verificação', async () => {
  const { register, verify, list } = setup();
  await register.execute({ name: 'Bruno', email: 'bruno@ifrs.edu.br' });
  await register.execute({ name: 'Ana', email: 'ana@ifrs.edu.br' });
  await verify.execute({ email: 'bruno@ifrs.edu.br', code: '123456' });

  const all = await list.execute({ page: 1, pageSize: 10 });
  assert.deepEqual(all.items.map((u) => u.name), ['Ana', 'Bruno']);
  assert.equal(all.total, 2);

  const verified = await list.execute({ verified: true, page: 1, pageSize: 10 });
  assert.deepEqual(verified.items, [{ name: 'Bruno', email: 'bruno@ifrs.edu.br', verified: true }]);
});

test('query pagina o resultado e informa o total', async () => {
  const { register, list } = setup();
  for (const name of ['Ana', 'Bia', 'Caio', 'Duda', 'Edu']) {
    await register.execute({ name, email: `${name.toLowerCase()}@ifrs.edu.br` });
  }

  const page2 = await list.execute({ page: 2, pageSize: 2 });
  assert.deepEqual(page2.items.map((u) => u.name), ['Caio', 'Duda']);
  assert.equal(page2.total, 5);
});
