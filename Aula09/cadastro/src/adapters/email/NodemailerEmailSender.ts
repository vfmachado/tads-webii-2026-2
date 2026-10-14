import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailSender } from '../../application/ports/EmailSender.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * HEXAGONAL: adaptador secundário — estratégia "nodemailer".
 * Este é o ÚNICO arquivo do projeto que importa `nodemailer`. Toda a
 * linguagem de infraestrutura (host, porta, transporter, sendMail) fica
 * presa aqui dentro; para fora ele só expõe a porta `EmailSender`.
 *
 * Note que ele recebe a configuração pronta no construtor em vez de ler
 * `process.env` — quem lê o ambiente é a composition root.
 */
export class NodemailerEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async sendVerificationCode(to: { name: string; email: string }, code: string): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.config.from,
      to: `"${to.name}" <${to.email}>`,
      subject: 'Seu código de verificação',
      text: `Olá, ${to.name}! Seu código de verificação é: ${code}`,
      html: `<p>Olá, ${to.name}!</p><p>Seu código de verificação é: <strong>${code}</strong></p>`,
    });

    // Com o Ethereal (smtp.ethereal.email) o e-mail não é entregue de
    // verdade; esta URL abre a mensagem capturada no navegador.
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`E-mail enviado. Pré-visualização: ${previewUrl}`);
    }
  }
}


// const nodemailer = require("nodemailer");
// const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

// // 1. Create an AWS SES client
// //    If you omit credentials, the SDK uses the default credential chain
// //    (environment variables, shared credentials file, IAM role, etc.)
// const sesClient = new SESv2Client({ region: "us-east-1" });

// // 2. Create a Nodemailer transport configured to use SES
// const transporter = nodemailer.createTransport({
//   SES: { sesClient, SendEmailCommand },
// });

// // 3. Send the message
// const info = await transporter.sendMail({
//   from: "sender@example.com",
//   to: "recipient@example.com",
//   subject: "Hello from Nodemailer + SES",
//   text: "I hope this message gets sent!",
//   // You can pass additional SES-specific options under the `ses` key:
//   ses: {
//     ConfigurationSetName: "my-config-set",
//     EmailTags: [{ Name: "tag_name", Value: "tag_value" }],
//   },
// });

// console.log(info.envelope); // { from: "sender@example.com", to: ["recipient@example.com"] }
// console.log(info.messageId); // The SES Message ID