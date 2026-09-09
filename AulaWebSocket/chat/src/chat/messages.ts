/**
 * ETAPA "protocolo": WebSocket transporta só bytes (texto ou binário) —
 * ao contrário do HTTP, não existe verbo, rota nem Content-Type embutido
 * no transporte. Este arquivo é o "contrato" que cliente e servidor
 * combinam por fora do protocolo: toda mensagem trocada é um JSON com um
 * campo `type`, e é esse campo que diz o que fazer com o resto do objeto.
 *
 * Cliente -> servidor: `join` (entrar num canal), `leave` (sair),
 * `message` (enviar um texto no canal atual).
 * Servidor -> cliente: `joined` (confirmação + lista de membros), `message`
 * (uma mensagem de chat, própria ou de outro membro), `system` (aviso de
 * entrada/saída de alguém no canal), `error` (a mensagem enviada era
 * inválida ou não fazia sentido no estado atual).
 */
export type ClientMessage =
  | { type: 'join'; channel: string; username: string }
  | { type: 'leave' }
  | { type: 'message'; text: string };

export type ServerMessage =
  | { type: 'joined'; channel: string; members: string[] }
  | { type: 'message'; channel: string; username: string; text: string; at: string }
  | { type: 'system'; channel: string; text: string }
  | { type: 'error'; message: string };

export class InvalidMessageError extends Error {}

/**
 * Só o servidor usa isto (para interpretar o que o cliente mandou), mas
 * fica aqui — perto do tipo que descreve — em vez de dentro do adaptador
 * WebSocket, porque validar formato de mensagem é uma regra do PROTOCOLO,
 * não um detalhe de como o socket foi aberto.
 */
export function parseClientMessage(raw: string): ClientMessage {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new InvalidMessageError('Mensagem não é um JSON válido');
  }

  if (typeof data !== 'object' || data === null) {
    throw new InvalidMessageError('Mensagem precisa ser um objeto JSON');
  }

  const { type } = data as Record<string, unknown>;

  if (type === 'join') {
    const { channel, username } = data as Record<string, unknown>;
    if (typeof channel !== 'string' || channel.trim().length === 0) {
      throw new InvalidMessageError('"channel" é obrigatório para entrar num canal');
    }
    if (typeof username !== 'string' || username.trim().length === 0) {
      throw new InvalidMessageError('"username" é obrigatório para entrar num canal');
    }
    return { type: 'join', channel: channel.trim(), username: username.trim() };
  }

  if (type === 'leave') {
    return { type: 'leave' };
  }

  if (type === 'message') {
    const { text } = data as Record<string, unknown>;
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new InvalidMessageError('"text" é obrigatório para enviar uma mensagem');
    }
    return { type: 'message', text: text.trim() };
  }

  throw new InvalidMessageError(`Tipo de mensagem desconhecido: "${String(type)}"`);
}

export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}
