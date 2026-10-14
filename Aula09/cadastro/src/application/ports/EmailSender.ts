/**
 * HEXAGONAL: porta de saída (driven port) para envio de e-mail.
 *
 * Ela fala a língua do NEGÓCIO ("envie o código de verificação para este
 * usuário"), não a da ferramenta ("host", "porta SMTP", "transporter").
 * Cada estratégia de envio é um adaptador diferente que implementa esta
 * mesma interface:
 *   - `adapters/email/ConsoleEmailSender.ts`    -> imprime no console
 *   - `adapters/email/NodemailerEmailSender.ts` -> envia via SMTP
 */
export interface EmailSender {
  sendVerificationCode(to: { name: string; email: string }, code: string): Promise<void>;
}
