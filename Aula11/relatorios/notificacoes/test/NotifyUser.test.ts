import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotifyUser } from '../src/application/commands/NotifyUser.js';
import type { Notification, Notifier } from '../src/application/ports/Notifier.js';
import { InMemoryNotificationLog } from '../src/adapters/memory/InMemoryNotificationLog.js';
import { reportCompletedEvent } from '../src/adapters/kafka/events.js';

class FakeNotifier implements Notifier {
  readonly sent: Notification[] = [];
  failNext = false;
  async send(notification: Notification) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP fora do ar');
    }
    this.sent.push(notification);
  }
}

const reportId = '22222222-2222-4222-8222-222222222222';

function setup() {
  const notifier = new FakeNotifier();
  const notifyUser = new NotifyUser(notifier, new InMemoryNotificationLog(), 'http://api.test');
  return { notifier, notifyUser };
}

test('relatório pronto: e-mail com o resumo e o link de download da API', async () => {
  const { notifier, notifyUser } = setup();
  assert.equal(await notifyUser.reportReady({ reportId, email: 'ana@exemplo.com', salesCount: 10, totalCents: 123456 }), true);

  const [email] = notifier.sent;
  assert.equal(email!.to, 'ana@exemplo.com');
  assert.match(email!.subject, /está pronto/);
  assert.match(email!.text, new RegExp(`http://api.test/reports/${reportId}/download`));
  assert.match(email!.text, /R\$\s1\.234,56/);
});

test('mensagem duplicada (at-least-once): o usuário recebe UM e-mail', async () => {
  const { notifier, notifyUser } = setup();
  const input = { reportId, email: 'ana@exemplo.com', salesCount: 1, totalCents: 100 };
  await notifyUser.reportReady(input);
  assert.equal(await notifyUser.reportReady(input), false);
  assert.equal(notifier.sent.length, 1);
});

test('SMTP falhou: o erro sobe e a próxima entrega da mesma mensagem envia', async () => {
  const { notifier, notifyUser } = setup();
  const input = { reportId, email: 'ana@exemplo.com', salesCount: 1, totalCents: 100 };
  notifier.failNext = true;
  await assert.rejects(notifyUser.reportReady(input), /SMTP/);
  assert.equal(await notifyUser.reportReady(input), true);
  assert.equal(notifier.sent.length, 1);
});

test('relatório que falhou também avisa o usuário', async () => {
  const { notifier, notifyUser } = setup();
  await notifyUser.reportFailed({ reportId, email: 'ana@exemplo.com', reason: 'timeout no banco' });
  assert.match(notifier.sent[0]!.subject, /Não conseguimos/);
  assert.match(notifier.sent[0]!.text, /timeout no banco/);
});

test('contrato tolerante: campos que este serviço não usa são aceitos e ignorados', () => {
  const parsed = reportCompletedEvent.safeParse({
    eventId: '33333333-3333-4333-8333-333333333333',
    reportId,
    email: 'ana@exemplo.com',
    summary: { salesCount: 1, totalCents: 100 },
    file: { bucket: 'b', key: 'k', sizeBytes: 1 },
    campoNovoDoWorker: 'qualquer coisa',
  });
  assert.equal(parsed.success, true);
});
