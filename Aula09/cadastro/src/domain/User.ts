import {
  InvalidUserDataError,
  InvalidVerificationCodeError,
  UserAlreadyVerifiedError,
} from './errors.js';

/**
 * HEXAGONAL: domínio (núcleo). A entidade `User` conhece as próprias
 * regras — o que é um cadastro válido e quando um código de verificação
 * pode ser aceito — sem importar Express, Nodemailer nem nenhum banco.
 *
 * Repare que o domínio NÃO gera o código nem envia o e-mail: ele só
 * recebe o código pronto e sabe conferi-lo. Gerar e enviar são
 * necessidades do caso de uso, atendidas por portas de saída.
 */
export class User {
  // construtor privado -> nao pode instanciar com o new
  private constructor(
    readonly name: string,
    readonly email: string,
    private verificationCode: string | null,
    private _verified: boolean,
  ) {}

  // metodo statico que instancia um user validado
  static create(name: string, email: string, verificationCode: string): User {
    if (name.trim().length < 2) {
      throw new InvalidUserDataError('O nome deve ter pelo menos 2 caracteres');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidUserDataError('E-mail inválido');
    }
    return new User(name.trim(), email.toLowerCase(), verificationCode, false);
  }

  get verified(): boolean {
    return this._verified;
  }

  verify(code: string): void {
    if (this._verified) {
      throw new UserAlreadyVerifiedError();
    }
    if (code !== this.verificationCode) {
      throw new InvalidVerificationCodeError();
    }
    this._verified = true;
    this.verificationCode = null; // código de uso único
  }
}
