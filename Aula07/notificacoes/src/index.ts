// =============================================================================
// Aula 07 — Serviço de notificações multicanal
//
// ATENÇÃO: este arquivo é PROPOSITALMENTE escrito sem nenhum padrão
// arquitetural. Tudo mora aqui: configuração, acesso ao banco, regras de
// negócio, integração com os "provedores" de envio e as rotas HTTP.
//
// Ele funciona. O objetivo da aula é transformá-lo em Ports and Adapters
// seguindo o roteiro do README.md — sem mudar o comportamento da API.
// =============================================================================
import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3007;
const SMS_FAILURE_RATE = process.env.SMS_FAILURE_RATE ? Number(process.env.SMS_FAILURE_RATE) : 0.2;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
});

// Caixa de entrada do canal "fake": guarda as mensagens em memória para que
// dê para conferir o que foi "enviado" sem depender de nenhum serviço externo.
const fakeInbox: { id: string; contactId: number; subject: string | null; message: string; receivedAt: Date }[] = [];

const app = express();
app.use(express.json());

// -----------------------------------------------------------------------------
// Contatos
// -----------------------------------------------------------------------------
app.post('/contacts', async (req, res) => {
  const { name, email, phone, optOut } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'name é obrigatório (mínimo 2 caracteres)' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'email inválido' });
  }
  if (phone && !/^\+\d{10,15}$/.test(phone)) {
    return res.status(400).json({ error: 'phone deve estar no formato E.164 (ex.: +5551999998888)' });
  }
  if (!email && !phone) {
    return res.status(400).json({ error: 'informe ao menos email ou phone' });
  }
  if (optOut && (!Array.isArray(optOut) || optOut.some((c: string) => !['fake', 'sms', 'email'].includes(c)))) {
    return res.status(400).json({ error: 'optOut deve ser uma lista com: fake, sms, email' });
  }

  const contact = await prisma.contact.create({
    data: { name: name.trim(), email, phone, optOut: (optOut ?? []).join(',') },
  });
  res.status(201).json({ ...contact, optOut: contact.optOut ? contact.optOut.split(',') : [] });
});

app.get('/contacts', async (_req, res) => {
  const contacts = await prisma.contact.findMany({ orderBy: { id: 'asc' } });
  res.json(contacts.map((c) => ({ ...c, optOut: c.optOut ? c.optOut.split(',') : [] })));
});

app.get('/contacts/:id', async (req, res) => {
  const contact = await prisma.contact.findUnique({ where: { id: Number(req.params.id) } });
  if (!contact) return res.status(404).json({ error: 'contato não encontrado' });
  res.json({ ...contact, optOut: contact.optOut ? contact.optOut.split(',') : [] });
});

// -----------------------------------------------------------------------------
// Notificações
// -----------------------------------------------------------------------------
app.post('/notifications', async (req, res) => {
  const { contactId, channels, subject, message } = req.body ?? {};

  if (!contactId || !Array.isArray(channels) || channels.length === 0 || !message) {
    return res.status(400).json({ error: 'contactId, channels (lista) e message são obrigatórios' });
  }
  for (const ch of channels) {
    if (!['fake', 'sms', 'email'].includes(ch)) {
      return res.status(400).json({ error: `canal desconhecido: ${ch}` });
    }
  }

  const contact = await prisma.contact.findUnique({ where: { id: Number(contactId) } });
  if (!contact) return res.status(404).json({ error: 'contato não encontrado' });

  // Limite de envio: no máximo 5 notificações por contato por minuto.
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recent = await prisma.notification.count({
    where: { contactId: contact.id, createdAt: { gte: oneMinuteAgo } },
  });
  if (recent + channels.length > 5) {
    return res.status(429).json({ error: 'limite de 5 notificações por minuto para este contato' });
  }

  const results = [];
  for (const channel of new Set<string>(channels)) {
    // Regras específicas de cada canal, todas aqui no meio do handler.
    let validationError: string | null = null;
    if (contact.optOut.split(',').includes(channel)) {
      validationError = `contato optou por não receber ${channel}`;
    } else if (channel === 'sms' && !contact.phone) {
      validationError = 'contato não possui telefone';
    } else if (channel === 'sms' && message.length > 160) {
      validationError = 'mensagem de SMS não pode passar de 160 caracteres';
    } else if (channel === 'email' && !contact.email) {
      validationError = 'contato não possui email';
    } else if (channel === 'email' && !subject) {
      validationError = 'email exige subject';
    }

    let notification = await prisma.notification.create({
      data: {
        contactId: contact.id,
        channel,
        subject: subject ?? null,
        message,
        status: validationError ? 'FAILED' : 'PENDING',
        lastError: validationError,
      },
    });

    if (!validationError) {
      // "Envio" de verdade: cada canal com seu provedor, direto no handler.
      try {
        let providerId: string;
        if (channel === 'fake') {
          providerId = 'fake-' + crypto.randomUUID();
          fakeInbox.push({ id: providerId, contactId: contact.id, subject: subject ?? null, message, receivedAt: new Date() });
        } else if (channel === 'sms') {
          await new Promise((r) => setTimeout(r, 150)); // simula latência da operadora
          if (Math.random() < SMS_FAILURE_RATE) throw new Error('operadora de SMS indisponível');
          providerId = 'sms-' + crypto.randomUUID().slice(0, 8);
          console.log(`[SMS] para ${contact.phone}: ${message}`);
        } else {
          await new Promise((r) => setTimeout(r, 300)); // simula latência do SMTP
          providerId = `<${crypto.randomUUID()}@notificacoes.local>`;
          console.log(`[EMAIL] From: no-reply@notificacoes.local\n        To: ${contact.name} <${contact.email}>\n        Subject: ${subject}\n\n        ${message}`);
        }
        notification = await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', attempts: 1, providerId, sentAt: new Date() },
        });
      } catch (err) {
        notification = await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED', attempts: 1, lastError: (err as Error).message },
        });
      }
    }
    results.push(notification);
  }

  res.status(201).json(results);
});

app.get('/notifications', async (req, res) => {
  const where: any = {};
  if (req.query.status) where.status = String(req.query.status).toUpperCase();
  if (req.query.channel) where.channel = String(req.query.channel);
  if (req.query.contactId) where.contactId = Number(req.query.contactId);
  const list = await prisma.notification.findMany({ where, orderBy: { id: 'desc' } });
  res.json(list);
});

app.get('/notifications/:id', async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: Number(req.params.id) }, include: { contact: true } });
  if (!n) return res.status(404).json({ error: 'notificação não encontrada' });
  res.json(n);
});

// Reenvia uma notificação que falhou. Máximo de 3 tentativas.
app.post('/notifications/:id/retry', async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: Number(req.params.id) }, include: { contact: true } });
  if (!n) return res.status(404).json({ error: 'notificação não encontrada' });
  if (n.status === 'SENT') return res.status(409).json({ error: 'notificação já foi enviada' });
  if (n.attempts >= 3) return res.status(409).json({ error: 'número máximo de tentativas (3) atingido' });

  // Mesmas validações do POST /notifications — copiadas e coladas.
  const contact = n.contact;
  if (contact.optOut.split(',').includes(n.channel)) {
    return res.status(422).json({ error: `contato optou por não receber ${n.channel}` });
  }
  if (n.channel === 'sms' && !contact.phone) return res.status(422).json({ error: 'contato não possui telefone' });
  if (n.channel === 'email' && !contact.email) return res.status(422).json({ error: 'contato não possui email' });

  try {
    let providerId: string;
    if (n.channel === 'fake') {
      providerId = 'fake-' + crypto.randomUUID();
      fakeInbox.push({ id: providerId, contactId: contact.id, subject: n.subject, message: n.message, receivedAt: new Date() });
    } else if (n.channel === 'sms') {
      await new Promise((r) => setTimeout(r, 150));
      if (Math.random() < SMS_FAILURE_RATE) throw new Error('operadora de SMS indisponível');
      providerId = 'sms-' + crypto.randomUUID().slice(0, 8);
      console.log(`[SMS] para ${contact.phone}: ${n.message}`);
    } else {
      await new Promise((r) => setTimeout(r, 300));
      providerId = `<${crypto.randomUUID()}@notificacoes.local>`;
      console.log(`[EMAIL] From: no-reply@notificacoes.local\n        To: ${contact.name} <${contact.email}>\n        Subject: ${n.subject}\n\n        ${n.message}`);
    }
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data: { status: 'SENT', attempts: n.attempts + 1, providerId, sentAt: new Date(), lastError: null },
    });
    res.json(updated);
  } catch (err) {
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data: { status: 'FAILED', attempts: n.attempts + 1, lastError: (err as Error).message },
    });
    res.status(502).json(updated);
  }
});

// Caixa de entrada do canal fake.
app.get('/fake-inbox/:contactId', (req, res) => {
  res.json(fakeInbox.filter((m) => m.contactId === Number(req.params.contactId)));
});

app.listen(PORT, () => {
  console.log(`Aula 07 - notificações rodando em http://localhost:${PORT}`);
});
