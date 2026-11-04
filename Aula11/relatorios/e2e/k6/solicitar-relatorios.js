// Teste de carga da API com k6 (https://k6.io).
//
//   docker compose --profile carga run --rm k6
//   docker compose --profile carga run --rm -e RATE=50 -e DURATION=30s k6
//
// O que ele mede: a API continua respondendo RÁPIDO (202 em poucos ms) mesmo
// recebendo muito mais pedidos por segundo do que os workers conseguem
// processar. A diferença fica na fila do Kafka: abra o Kafka UI
// (http://localhost:8080 → Consumers → relatorios-workers) e veja o LAG subir
// durante o teste e descer depois, no ritmo dos workers.
//
// Atenção: cada pedido vira um relatório de verdade (~1 s de worker cada).
// Com RATE=10 e DURATION=20s são 200 relatórios: ~70 s para 3 workers
// esvaziarem a fila. Para descartar a fila, veja o README (reset de offsets).
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3011';

export const options = {
  scenarios: {
    pedidos: {
      // Taxa de chegada CONSTANTE (pedidos/s), independente de quanto a API demora.
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 10),
      timeUnit: '1s',
      duration: __ENV.DURATION || '20s',
      preAllocatedVUs: 20,
      maxVUs: 200,
    },
  },
  thresholds: {
    // O POST só grava e publica no Kafka: tem que ser rápido.
    'http_req_duration{name:POST /reports}': ['p(95)<200'],
    checks: ['rate>0.99'],
  },
};

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export default function () {
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  const body = JSON.stringify({
    email: `k6-${__VU}-${__ITER}@exemplo.com`,
    // 1 dia de período: o relatório mais leve (~1 s no worker).
    filters: { from: `2026-03-${day}`, to: `2026-03-${day}`, region: REGIONS[__ITER % REGIONS.length] },
  });

  const res = http.post(`${BASE_URL}/reports`, body, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /reports' },
  });

  check(res, {
    '202 Accepted': (r) => r.status === 202,
    'tem Location': (r) => !!r.headers.Location,
  });
}
