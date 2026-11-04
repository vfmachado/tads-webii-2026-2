import type { StoredFile } from './ReportStorage.js';

export interface ReportCompleted {
  reportId: string;
  email: string;
  file: StoredFile;
  summary: { salesCount: number; totalCents: number };
  processedBy: string;
  durationMs: number;
}

export interface ReportFailed {
  reportId: string;
  email: string;
  reason: string;
  attempts: number;
  processedBy: string;
}

/**
 * HEXAGONAL: porta de saída. "Avise o mundo que o relatório terminou."
 *
 * O worker NÃO sabe quem vai reagir (a API atualiza o status, o serviço de
 * notificações manda o e-mail, amanhã pode ser um serviço de auditoria).
 * Ele só publica o fato. Isso é o que torna os serviços DESACOPLADOS.
 */
export interface ReportEventPublisher {
  completed(event: ReportCompleted): Promise<void>;
  failed(event: ReportFailed): Promise<void>;
}
