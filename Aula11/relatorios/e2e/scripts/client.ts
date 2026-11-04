/** Funções compartilhadas pelos testes e2e e pelos scripts de carga. */
export const API = process.env.API_URL ?? 'http://localhost:3011';
export const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

export interface ReportView {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  email: string;
  totalMs?: number;
  processingMs?: number;
  processedBy?: string;
  summary?: { salesCount: number; totalCents: number };
  failureReason?: string;
  links: { self: string; download?: string };
}

export interface ReportRequestBody {
  email: string;
  filters: { from: string; to: string; region?: string; category?: string };
}

export async function requestReport(body: ReportRequestBody): Promise<{ status: number; report: ReportView; ms: number }> {
  const start = performance.now();
  const res = await fetch(`${API}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = performance.now() - start;
  return { status: res.status, report: (await res.json()) as ReportView, ms };
}

export async function getReport(id: string): Promise<ReportView> {
  return (await (await fetch(`${API}/reports/${id}`)).json()) as ReportView;
}

/** Polling: consulta o status até sair de PENDING (ou estourar o tempo). */
export async function waitUntilFinished(id: string, timeoutMs = 60_000, intervalMs = 250): Promise<ReportView> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const report = await getReport(id);
    if (report.status !== 'PENDING') return report;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`relatório ${id} ainda PENDING depois de ${timeoutMs} ms`);
}

/** Procura no Mailpit os e-mails enviados para um endereço. */
export async function findEmails(to: string): Promise<{ Subject: string; Snippet: string }[]> {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const body = (await res.json()) as { messages: { Subject: string; Snippet: string }[] };
  return body.messages;
}

export async function waitForEmail(to: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const emails = await findEmails(to);
    if (emails.length) return emails;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`nenhum e-mail para ${to} em ${timeoutMs} ms`);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
