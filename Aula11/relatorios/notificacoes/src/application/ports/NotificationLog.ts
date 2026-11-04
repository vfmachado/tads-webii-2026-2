/**
 * HEXAGONAL: porta de saída. Registro de quais avisos já foram enviados.
 *
 * Existe por causa do at-least-once: o mesmo `report.completed` pode chegar
 * duas vezes (o worker reprocessou, ou o serviço caiu depois de mandar o
 * e-mail e antes de confirmar o offset). Mandar o e-mail duas vezes é o
 * tipo de bug que o usuário PERCEBE.
 *
 * A chave é de NEGÓCIO (`completed:<reportId>`), não o `eventId`: se o
 * worker gerar o relatório duas vezes, são dois eventos diferentes sobre o
 * MESMO fato, e o usuário deve receber um e-mail só.
 */
export interface NotificationLog {
  /** Marca a chave como enviada. Devolve `false` se ela já estava marcada. */
  markAsSent(key: string): Promise<boolean>;
  unmark(key: string): Promise<void>;
}
