import type { NotificationLog } from '../ports/NotificationLog.js';
import type { Notification, Notifier } from '../ports/Notifier.js';

export interface ReportReadyInput {
  reportId: string;
  email: string;
  salesCount: number;
  totalCents: number;
}

export interface ReportFailedInput {
  reportId: string;
  email: string;
  reason: string;
}

/**
 * HEXAGONAL + CQRS: COMMANDS disparados por eventos.
 *
 * Este serviço não conhece a API nem o worker: ele só sabe que existem os
 * eventos `report.completed` e `report.failed`. O link do e-mail aponta
 * para a API (`/reports/:id/download`), que gera a URL temporária do S3 na
 * hora do clique.
 */
export class NotifyUser {
  constructor(
    private readonly notifier: Notifier,
    private readonly sent: NotificationLog,
    private readonly publicApiUrl: string,
  ) {}

  /** Devolve `false` se o aviso já tinha sido enviado (mensagem duplicada). */
  async reportReady(input: ReportReadyInput): Promise<boolean> {
    const downloadUrl = `${this.publicApiUrl}/reports/${input.reportId}/download`;
    const total = (input.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return this.sendOnce(`completed:${input.reportId}`, {
      to: input.email,
      subject: `Seu relatório de vendas está pronto (${input.reportId.slice(0, 8)})`,
      text:
        `Olá! O relatório ${input.reportId} terminou.\n\n` +
        `Vendas no período: ${input.salesCount}\nTotal: ${total}\n\n` +
        `Baixar: ${downloadUrl}\n`,
      html:
        `<p>Olá! O relatório <code>${input.reportId}</code> terminou.</p>` +
        `<ul><li>Vendas no período: <b>${input.salesCount}</b></li><li>Total: <b>${total}</b></li></ul>` +
        `<p><a href="${downloadUrl}">Baixar o relatório (CSV)</a></p>`,
    });
  }

  async reportFailed(input: ReportFailedInput): Promise<boolean> {
    return this.sendOnce(`failed:${input.reportId}`, {
      to: input.email,
      subject: `Não conseguimos gerar o seu relatório (${input.reportId.slice(0, 8)})`,
      text: `O relatório ${input.reportId} falhou: ${input.reason}.\nTente pedir de novo em alguns minutos.\n`,
      html: `<p>O relatório <code>${input.reportId}</code> falhou: ${input.reason}.</p><p>Tente pedir de novo em alguns minutos.</p>`,
    });
  }

  private async sendOnce(key: string, notification: Notification): Promise<boolean> {
    if (!(await this.sent.markAsSent(key))) return false;
    try {
      await this.notifier.send(notification);
      return true;
    } catch (err) {
      // Não enviou: desmarca e deixa o erro subir. O offset não é
      // confirmado e o Kafka entrega a mensagem de novo.
      await this.sent.unmark(key);
      throw err;
    }
  }
}
