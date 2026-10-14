import type { EmailSender } from '../../application/ports/EmailSender.js';

/**
 * HEXAGONAL: adaptador secundário — estratégia "console".
 * Útil em desenvolvimento e em aula: nenhum servidor SMTP é necessário,
 * o código aparece no terminal onde a API está rodando.
 */
export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(to: { name: string; email: string }, code: string): Promise<void> {
    console.log('──────────── E-MAIL (console) ────────────');
    console.log(`Para:    ${to.name} <${to.email}>`);
    console.log('Assunto: Seu código de verificação');
    console.log(`Código:  ${code}`);
    console.log('──────────────────────────────────────────');
  }
}
