// Teste de carga que faz a API ESCALAR (k6, https://k6.io).
//
//   scripts/carga.sh                         # pico de 60 req/s, platô de 2 min
//   PICO=30 PLATO=1m scripts/carga.sh
//
// MODELO ABERTO (ramping-arrival-rate): as requisições chegam numa TAXA, não
// importa se o sistema está lento. É como usuários reais se comportam, e é
// o que revela a fila crescendo quando falta capacidade. (No modelo fechado,
// com N usuários virtuais em loop, um sistema lento recebe MENOS carga e
// esconde o problema.)
//
// Perfil:   taxa
//           PICO ┤        ┌──────────── PLATO ────────────┐
//                │      ┌─┘                                └─┐
//         PICO/4 ┤ ┌────┘                                    └──┐
//                └─┴──────────────────────────────────────────────┴─▶ tempo
//                  RAMPA  RAMPA                              RAMPA
//
// Mistura: 60% relatório (CPU), 30% listagem (banco), 10% criar+apagar.
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8013').replace(/\/$/, '');
const PICO = Number(__ENV.PICO || 60);
const PLATO = __ENV.PLATO || '2m';
const RAMPA = __ENV.RAMPA || '30s';

export const options = {
  scenarios: {
    escala: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 400, // se faltar VU, o k6 avisa "Insufficient VUs": o sistema não dá conta
      stages: [
        { duration: RAMPA, target: Math.max(1, Math.round(PICO / 4)) }, // aquecimento
        { duration: RAMPA, target: PICO }, // subida
        { duration: PLATO, target: PICO }, // platô: tempo para o HPA reagir
        { duration: RAMPA, target: 0 }, // descida
      ],
    },
  },
  thresholds: {
    // Critérios de aceite. Falhou → o k6 sai com código ≠ 0.
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:GET /api/tasks/report}': ['p(95)<500'],
    'http_req_duration{name:GET /api/tasks}': ['p(95)<300'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const params = (name) => ({
  tags: { name },
  timeout: '10s', // um usuário real desiste bem antes dos 60 s padrão
  headers: { 'Content-Type': 'application/json' },
});

export default function () {
  const sorteio = Math.random();

  if (sorteio < 0.6) {
    const res = http.get(`${BASE_URL}/api/tasks/report`, params('GET /api/tasks/report'));
    check(res, { 'relatório 200': (r) => r.status === 200 });
  } else if (sorteio < 0.9) {
    const res = http.get(`${BASE_URL}/api/tasks`, params('GET /api/tasks'));
    check(res, { 'lista 200': (r) => r.status === 200 });
  } else {
    const res = http.post(`${BASE_URL}/api/tasks`, JSON.stringify({ title: `k6 ${__VU}-${__ITER}` }), params('POST /api/tasks'));
    if (check(res, { 'criou 201': (r) => r.status === 201 })) {
      const del = http.del(`${BASE_URL}/api/tasks/${res.json('id')}`, null, params('DELETE /api/tasks/:id'));
      check(del, { 'apagou 204': (r) => r.status === 204 });
    }
  }
}
