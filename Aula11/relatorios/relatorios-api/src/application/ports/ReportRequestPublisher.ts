import type { ReportFilters } from '../../domain/ReportFilters.js';

export interface ReportRequest {
  reportId: string;
  email: string;
  filters: ReportFilters;
  requestedAt: Date;
}

/**
 * HEXAGONAL: porta de saída. "Avise quem gera relatórios que há um novo
 * pedido." O caso de uso não sabe que do outro lado existe um Kafka, um
 * tópico ou uma partição: isso é detalhe do adaptador
 * (`adapters/kafka/KafkaReportRequestPublisher.ts`).
 */
export interface ReportRequestPublisher {
  publish(request: ReportRequest): Promise<void>;
}
