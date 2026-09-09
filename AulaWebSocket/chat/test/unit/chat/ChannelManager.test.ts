import { describe, expect, it, vi } from 'vitest';
import { ChannelManager, type ChatClient } from '../../../src/chat/ChannelManager.js';

function fakeClient(id: string, username: string): ChatClient {
  return { id, username, send: vi.fn() };
}

describe('ChannelManager#join', () => {
  it('adiciona o cliente ao canal e devolve os nomes dos membros', () => {
    const manager = new ChannelManager();
    const alice = fakeClient('1', 'Alice');

    expect(manager.join('geral', alice)).toEqual(['Alice']);
  });

  it('acumula membros no mesmo canal', () => {
    const manager = new ChannelManager();
    manager.join('geral', fakeClient('1', 'Alice'));
    const members = manager.join('geral', fakeClient('2', 'Bob'));

    expect(members.sort()).toEqual(['Alice', 'Bob']);
  });

  it('sai do canal anterior ao entrar em um novo (um canal por vez)', () => {
    const manager = new ChannelManager();
    const bob = fakeClient('1', 'Bob');
    manager.join('geral', bob);

    manager.join('dev', bob);

    expect(manager.membersOf('geral')).toEqual([]);
    expect(manager.membersOf('dev')).toEqual(['Bob']);
  });
});

describe('ChannelManager#leave', () => {
  it('remove o cliente e devolve o nome do canal', () => {
    const manager = new ChannelManager();
    const alice = fakeClient('1', 'Alice');
    manager.join('geral', alice);

    expect(manager.leave(alice)).toBe('geral');
    expect(manager.membersOf('geral')).toEqual([]);
  });

  it('devolve undefined quando o cliente não está em nenhum canal', () => {
    const manager = new ChannelManager();
    expect(manager.leave(fakeClient('1', 'Alice'))).toBeUndefined();
  });

  it('remove o canal da listagem quando o último membro sai', () => {
    const manager = new ChannelManager();
    const alice = fakeClient('1', 'Alice');
    manager.join('geral', alice);

    manager.leave(alice);

    expect(manager.listChannels()).toEqual([]);
  });
});

describe('ChannelManager#channelOf', () => {
  it('devolve o canal atual do cliente', () => {
    const manager = new ChannelManager();
    const alice = fakeClient('1', 'Alice');
    manager.join('geral', alice);

    expect(manager.channelOf(alice)).toBe('geral');
  });

  it('devolve undefined quando o cliente não está em nenhum canal', () => {
    const manager = new ChannelManager();
    expect(manager.channelOf(fakeClient('1', 'Alice'))).toBeUndefined();
  });
});

describe('ChannelManager#broadcast', () => {
  it('envia a mensagem para todos os membros do canal', () => {
    const manager = new ChannelManager();
    const alice = fakeClient('1', 'Alice');
    const bob = fakeClient('2', 'Bob');
    manager.join('geral', alice);
    manager.join('geral', bob);

    manager.broadcast('geral', 'oi');

    expect(alice.send).toHaveBeenCalledWith('oi');
    expect(bob.send).toHaveBeenCalledWith('oi');
  });

  it('não envia para o cliente excluído', () => {
    const manager = new ChannelManager();
    const alice = fakeClient('1', 'Alice');
    const bob = fakeClient('2', 'Bob');
    manager.join('geral', alice);
    manager.join('geral', bob);

    manager.broadcast('geral', 'oi', alice);

    expect(alice.send).not.toHaveBeenCalled();
    expect(bob.send).toHaveBeenCalledWith('oi');
  });

  it('não faz nada quando o canal não existe', () => {
    const manager = new ChannelManager();
    expect(() => manager.broadcast('inexistente', 'oi')).not.toThrow();
  });
});

describe('ChannelManager#listChannels', () => {
  it('lista os canais ativos com a contagem de membros, em ordem alfabética', () => {
    const manager = new ChannelManager();
    manager.join('dev', fakeClient('1', 'Alice'));
    manager.join('geral', fakeClient('2', 'Bob'));
    manager.join('geral', fakeClient('3', 'Carol'));

    expect(manager.listChannels()).toEqual([
      { name: 'dev', memberCount: 1 },
      { name: 'geral', memberCount: 2 },
    ]);
  });
});
