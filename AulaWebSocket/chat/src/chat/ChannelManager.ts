/**
 * ETAPA "estado dos canais": esta classe não sabe o que é WebSocket, HTTP
 * ou JSON — só sabe "quem está em qual canal" e "como mandar algo para
 * quem está num canal". `ChatClient` é a única coisa que ela pede de um
 * membro: um id único e uma forma de `send()`. Isso é o que permite
 * testar toda a lógica de entrar/sair/transmitir com objetos falsos (ver
 * test/unit/chat/ChannelManager.test.ts), sem abrir socket nenhum — o
 * mesmo raciocínio de "porta pequena" que a Aula 06 usa para
 * `ProjectRepository`.
 *
 * Estado guardado em dois sentidos:
 * - `channels`: canal -> membros (para transmitir e listar quem está lá).
 * - `clientChannel`: cliente -> canal atual (para saber de onde tirar
 *   alguém ao sair ou desconectar, sem varrer todos os canais).
 */
export interface ChatClient {
  readonly id: string;
  username: string;
  send(payload: string): void;
}

export interface ChannelSummary {
  name: string;
  memberCount: number;
}

export class ChannelManager {
  private readonly channels = new Map<string, Map<string, ChatClient>>();
  private readonly clientChannel = new Map<string, string>();

  /**
   * Entra num canal. Se o cliente já estava em outro canal, sai de lá
   * primeiro (um cliente só pode estar em um canal por vez nesta aula —
   * "trocar de canal" é, por baixo, um `leave` seguido de um `join`).
   * Devolve a lista de nomes de usuário do canal DEPOIS da entrada.
   */
  join(channelName: string, client: ChatClient): string[] {
    this.leave(client);

    let members = this.channels.get(channelName);
    if (!members) {
      members = new Map();
      this.channels.set(channelName, members);
    }
    members.set(client.id, client);
    this.clientChannel.set(client.id, channelName);

    return this.membersOf(channelName);
  }

  /**
   * Sai do canal atual do cliente, se houver um. Devolve o nome do canal
   * que ele deixou (para quem chamou poder avisar os outros membros) ou
   * `undefined` se o cliente não estava em nenhum canal — é assim que o
   * adaptador WebSocket sabe se precisa transmitir um aviso de saída.
   */
  leave(client: ChatClient): string | undefined {
    const channelName = this.clientChannel.get(client.id);
    if (!channelName) return undefined;

    const members = this.channels.get(channelName);
    members?.delete(client.id);
    if (members && members.size === 0) {
      this.channels.delete(channelName);
    }
    this.clientChannel.delete(client.id);

    return channelName;
  }

  channelOf(client: ChatClient): string | undefined {
    return this.clientChannel.get(client.id);
  }

  membersOf(channelName: string): string[] {
    const members = this.channels.get(channelName);
    if (!members) return [];
    return [...members.values()].map((member) => member.username);
  }

  /**
   * Transmite `payload` para todo mundo no canal, exceto `exclude` (se
   * informado) — usado para "fulano entrou" (todo mundo menos quem
   * entrou já sabe pela resposta `joined` direta) e, opcionalmente, para
   * não ecoar uma mensagem de volta para quem a enviou.
   */
  broadcast(channelName: string, payload: string, exclude?: ChatClient): void {
    const members = this.channels.get(channelName);
    if (!members) return;

    for (const member of members.values()) {
      if (member.id === exclude?.id) continue;
      member.send(payload);
    }
  }

  listChannels(): ChannelSummary[] {
    return [...this.channels.entries()]
      .map(([name, members]) => ({ name, memberCount: members.size }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
