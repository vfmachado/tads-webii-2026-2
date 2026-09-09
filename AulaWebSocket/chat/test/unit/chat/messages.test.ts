import { describe, expect, it } from 'vitest';
import { InvalidMessageError, parseClientMessage, serializeServerMessage } from '../../../src/chat/messages.js';

describe('parseClientMessage', () => {
  it('interpreta uma mensagem "join" válida, aparando espaços', () => {
    const message = parseClientMessage(JSON.stringify({ type: 'join', channel: ' geral ', username: ' Ana ' }));
    expect(message).toEqual({ type: 'join', channel: 'geral', username: 'Ana' });
  });

  it('rejeita "join" sem channel', () => {
    expect(() => parseClientMessage(JSON.stringify({ type: 'join', username: 'Ana' }))).toThrow(InvalidMessageError);
  });

  it('rejeita "join" com channel vazio', () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: 'join', channel: '   ', username: 'Ana' })),
    ).toThrow(InvalidMessageError);
  });

  it('rejeita "join" sem username', () => {
    expect(() => parseClientMessage(JSON.stringify({ type: 'join', channel: 'geral' }))).toThrow(InvalidMessageError);
  });

  it('interpreta uma mensagem "leave"', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'leave' }))).toEqual({ type: 'leave' });
  });

  it('interpreta uma mensagem "message" válida, aparando espaços', () => {
    const message = parseClientMessage(JSON.stringify({ type: 'message', text: '  oi  ' }));
    expect(message).toEqual({ type: 'message', text: 'oi' });
  });

  it('rejeita "message" sem text', () => {
    expect(() => parseClientMessage(JSON.stringify({ type: 'message' }))).toThrow(InvalidMessageError);
  });

  it('rejeita "message" com text vazio', () => {
    expect(() => parseClientMessage(JSON.stringify({ type: 'message', text: '   ' }))).toThrow(InvalidMessageError);
  });

  it('rejeita um tipo desconhecido', () => {
    expect(() => parseClientMessage(JSON.stringify({ type: 'ping' }))).toThrow(InvalidMessageError);
  });

  it('rejeita um JSON malformado', () => {
    expect(() => parseClientMessage('{ isso não é json')).toThrow(InvalidMessageError);
  });

  it('rejeita um JSON que não é um objeto', () => {
    expect(() => parseClientMessage(JSON.stringify('uma string'))).toThrow(InvalidMessageError);
  });

  it('rejeita um JSON nulo', () => {
    expect(() => parseClientMessage('null')).toThrow(InvalidMessageError);
  });
});

describe('serializeServerMessage', () => {
  it('serializa uma mensagem de servidor como JSON', () => {
    const json = serializeServerMessage({ type: 'system', channel: 'geral', text: 'Ana entrou no canal' });
    expect(JSON.parse(json)).toEqual({ type: 'system', channel: 'geral', text: 'Ana entrou no canal' });
  });
});
