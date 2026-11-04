import nodemailer, { type Transporter } from 'nodemailer';
import type { Notification, Notifier } from '../../application/ports/Notifier.js';

/**
 * HEXAGONAL: adaptador secundário. Envia por SMTP (Nodemailer, como na
 * Aula 08). No Docker, o SMTP é o Mailpit: ele aceita qualquer e-mail e
 * mostra tudo numa caixa de entrada web (http://localhost:8025).
 */
export class SmtpNotifier implements Notifier {
  private readonly transporter: Transporter;

  constructor(
    host: string,
    port: number,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({ host, port, secure: false });
  }

  async send(notification: Notification): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...notification });
    console.log(`[email] → ${notification.to}: ${notification.subject}`);
  }
}
