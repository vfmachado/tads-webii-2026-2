---
marp: true
theme: default
paginate: true
title: "Aula 11 — Kafka: mensageria e processamento assíncrono"
style: |
  section { font-size: 26px; }
  section.titulo { text-align: center; justify-content: center; }
  section.titulo h1 { font-size: 56px; }
  pre { font-size: 19px; }
  table { font-size: 22px; }
  .small { font-size: 20px; }
---

<!--
Slides em Marp (https://marp.app). No VS Code: instale a extensão
"Marp for VS Code", abra este arquivo e clique em "Open Preview".
Para exportar: Command Palette → "Marp: Export Slide Deck" (PDF, PPTX, HTML).
Texto completo para estudo: kafka-leitura.md
-->

<!-- _class: titulo -->

# Kafka

### Mensageria e processamento assíncrono

Web II · Aula 11

---

## Onde paramos

- **Aula 06**: arquitetura hexagonal (portas e adaptadores)
- **Aula 08–09**: casos de uso, Zod, CQRS
- **Aula 10**: Redis para cache e lock entre **várias instâncias**

Hoje: e quando o trabalho **não cabe** numa requisição?

---

## O problema

"Quero o relatório de vendas consolidado do ano, só da região Sul."

```
Usuário ── POST /reports ──▶ API ── SELECT ... GROUP BY ──▶ Banco
                              │         (2 minutos)
         ◀── espera... ───────┘
```

- **Timeout**: proxy e navegador desistem em 30–60 s
- **Recurso preso**: 20 relatórios = 20 conexões presas = API fora do ar
- **Sem segunda chance**: o processo caiu, perdeu tudo
- **Escala amarrada**: para gerar mais relatórios, escala a API inteira

---

## A ideia: separar o **pedido** do **trabalho**

```
Usuário ── POST ──▶ API ──"pedido 42"──▶ [ Kafka ] ──▶ Worker
        ◀── 202 ───┘  (milissegundos)                    │ gera (2 min)
                                                         ▼
Usuário ◀── e-mail ── Notificações ◀──"42 pronto"── [ Kafka ]
```

- `202 Accepted`: "recebi, ainda não terminei" + `Location: /reports/42`
- O worker trabalha **no seu ritmo**
- Quem precisa saber do resultado **escuta** o evento

---

## Mensageria

| | HTTP direto | Mensageria |
| --- | --- | --- |
| Quem chama espera? | Sim | Não |
| O outro lado precisa estar no ar? | Sim | Não |
| Quem chama conhece quem responde? | Sim (URL) | Não (só o **tópico**) |
| Pico de tráfego | Vai direto ao serviço | O broker **absorve** |
| Vários interessados | Uma chamada para cada | Uma mensagem, todos leem |

**Preço**: consistência eventual, depuração mais difícil, duplicatas

---

## Fila × log

**Fila** (RabbitMQ, SQS): entregou → **apagou**

**Kafka**: um **log** onde só se acrescenta no final

```
report.requested · partição 0
offset:  0     1     2     3     4     5     6
       ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
       │ r17 │ r21 │ r22 │ r30 │ r31 │ r35 │ r40 │ ◀── produtor
       └─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                    ▲                 ▲
          notificações está aqui    workers estão aqui
```

- Ler **não apaga** (retenção: 7 dias por padrão)
- Cada leitor guarda **a sua posição**
- Dá para **voltar no tempo** e reprocessar

---

## Vocabulário

| Conceito | O que é |
| -------- | ------- |
| **Broker** | Um servidor Kafka (cluster = vários) |
| **Tópico** | Um assunto: `report.requested` |
| **Partição** | Um dos N logs do tópico: **paralelismo** e **ordem** |
| **Mensagem** | chave + valor (bytes) + headers |
| **Chave** | Decide a partição: `hash(chave) % N` |
| **Offset** | Posição na partição: 0, 1, 2... |
| **Produtor / consumidor** | Quem escreve / quem lê |
| **Grupo de consumidores** | Quem **divide** o trabalho de ler um tópico |

---

## A regra de ouro dos grupos

> **Dentro** de um grupo: cada partição vai para **um** consumidor.
> **Entre** grupos: cada grupo recebe **tudo**.

```
                   ┌──────── grupo relatorios-workers ────────┐
report.requested   │  P0 ──▶ worker A                         │  dividem
 (3 partições)     │  P1 ──▶ worker B                         │  o trabalho
                   │  P2 ──▶ worker C                         │
                   └──────────────────────────────────────────┘

report.completed ──┬──▶ grupo relatorios-api   (atualiza o status)   cada um
                   └──▶ grupo notificacoes     (manda o e-mail)      recebe tudo
```

---

## Partições = teto de paralelismo

Medido no projeto: 12 relatórios de ~2,4 s, tópico com 3 partições

| Workers | Até o último ficar pronto | Por réplica |
| ------- | ------------------------- | ----------- |
| 1 | 28,9 s | 12 |
| 3 | 12,2 s | 5 / 4 / 3 |
| 5 | **12,2 s** | 5 / 4 / 3 + **2 ociosos** |

- 5 workers, 3 partições → 2 sem nada para fazer
- 3 workers ≠ 3x: as chaves caíram desiguais (5/4/3)
- Partições se aumentam depois, mas **nunca diminuem**

---

## Offset, commit e lag

```
partição 0:  [0][1][2][3][4][5][6][7]
                      ▲           ▲
             commit = 3        último = 7      LAG = 4
```

- **Commit**: "processei até aqui" (fica no tópico `__consumer_offsets`)
- O `kafkajs` faz o commit quando `eachMessage` **termina sem erro**
- **Lag** = o que falta processar → **a** métrica de saúde
- Grupo novo + `fromBeginning: true` → lê desde o início

---

## Heartbeat: "ainda estou vivo"

- O consumidor avisa o Kafka de tempos em tempos
- `sessionTimeout` (30 s) sem aviso → **morreu** → partição vai para outro

**Armadilha das tarefas longas**: relatório de 2 min sem heartbeat → o Kafka acha que o worker morreu → **outro worker pega a mesma mensagem**

```ts
eachMessage: async ({ message, heartbeat }) => {
  await gerarRelatorio(evento, async () => {
    await heartbeat();          // a cada etapa do relatório
  });
}
```

---

## Desligar × cair (medido)

Relatório de 6,5 s, 2 workers, interrompido no meio:

| | O que acontece | Pronto em |
| --- | --- | --- |
| `docker stop` (SIGTERM) | Termina, faz o commit, sai do grupo | **7 s** |
| `docker kill` (SIGKILL) | Kafka espera 30 s, outro worker **refaz** | **39 s** |

```ts
process.once('SIGTERM', async () => {
  await consumer.disconnect();   // sai do grupo avisando
  process.exit(0);
});
```

---

## Garantias de entrega

| | Perde? | Duplica? | Como |
| --- | --- | --- | --- |
| *At-most-once* | pode | não | commit **antes** |
| ***At-least-once*** | não | **pode** | commit **depois** (padrão) |
| *Exactly-once* | não | não | transações, **só dentro do Kafka** |

E-mail enviado e arquivo no S3 **não** entram em transação do Kafka.

**Conclusão: conte com duplicatas.**

---

## Idempotência

> Processar duas vezes = processar uma vez

| Serviço | Defesa contra duplicata |
| ------- | ----------------------- |
| Worker | Sempre grava em `reports/<id>.csv` (sobrescreve) |
| API | `PENDING → COMPLETED` só uma vez; a 2ª é ignorada |
| Notificações | Marca `completed:<reportId>` antes de enviar |

A chave de idempotência é **de negócio** (o relatório), não o id da mensagem

---

## Ordem

- Garantida **só dentro da partição**
- Mesma chave → mesma partição → mesma ordem

| Chave de `report.requested` | Efeito |
| --------------------------- | ------ |
| `reportId` ✔ | espalha: bom para paralelismo |
| `email` | um usuário com 50 pedidos ocupa uma partição |
| nenhuma | espalha, sem ordem nenhuma |

---

## Mensagens são só bytes: valide

- O contrato (JSON) é combinado entre produtor e consumidor
- Quem consome **valida com Zod** (Aula 09)
- Mensagem inválida → **ignora e registra**

Se lançar erro: entrega de novo → erro → de novo...
**Poison pill**: a partição trava para sempre

Em produção: manda para uma **DLQ** (*dead letter queue*)

---

<!-- _class: titulo -->

# O projeto

`Aula11/relatorios/`

---

## Três serviços, zero chamadas HTTP entre eles

```
            report.requested                    report.completed
 API ───────────────────────▶ [Kafka] ─▶ Worker ─────────────────▶ [Kafka]
  ▲  (produz)                  grupo: relatorios-workers  │           │
  │                                        CSV ▼         │           │
  │                                       [ S3 ]          │           │
  └───────────────── grupo relatorios-api ◀───────────────┴───────────┤
                                                                      ▼
                                    grupo notificacoes ─▶ Notificações ─▶ e-mail
```

| Serviço | Produz | Consome |
| ------- | ------ | ------- |
| relatorios-api | `report.requested` | `completed`, `failed` |
| relatorios-worker | `completed`, `failed` | `report.requested` |
| notificacoes | — | `completed`, `failed` |

---

## No hexágono, o Kafka é só mais um adaptador

```
           ┌──────────────── relatorios-worker ────────────────┐
 Kafka ──▶ │ reportRequestsConsumer ─▶ GenerateReport           │
 (entrada) │  (adaptador primário)      │                       │
           │                            ├─▶ SalesRepository ─▶ banco (mock)
           │                            ├─▶ ReportStorage ───▶ S3
           │                            └─▶ ReportEventPublisher ─▶ Kafka
           └────────────────────────────────────────────────────┘
```

- O consumidor faz para o Kafka o que a rota faz para o HTTP
- `GenerateReport` não sabe o que é tópico, partição ou heartbeat
- Testes unitários sem Kafka: adaptadores falsos

---

## O "peso" do relatório (mock)

```
tempo = 1 s + 15 ms × dias do período

1 semana ≈ 1,1 s     3 meses ≈ 2,4 s     1 ano ≈ 6,5 s
```

- ~87 mil vendas simuladas (2025–2026), sempre as mesmas
- `REPORT_FAILURE_RATE=0.3` → 30% das consultas falham
- Falhou? Tenta de novo (3x) → esgotou → `report.failed` → e-mail de aviso

---

## Download: por que não pôr o link na mensagem?

- O arquivo fica no **S3**; o link é uma **presigned URL** (assinada, expira)
- Link na mensagem → expira antes de o usuário abrir o e-mail
- Então o e-mail aponta para a **API**:

```
GET /reports/42/download  ──▶  302 Location: http://s3/.../42.csv?X-Amz-Signature=...
                                (gerada agora, vale 5 min)
```

---

## Subindo tudo

```bash
cd Aula11/relatorios
docker compose up -d --build
docker compose up -d --scale relatorios-worker=3
```

| | |
| --- | --- |
| API | http://localhost:3011 |
| Kafka UI | http://localhost:8080 |
| E-mails (Mailpit) | http://localhost:8025 |
| S3 (RustFS) | http://localhost:9001/rustfs/console/ |

---

## Testes de carga

**k6**: a API aguenta?

```bash
docker compose --profile carga run --rm k6       # 10 pedidos/s
```
p95 do `POST /reports` = **6,6 ms**, enquanto cada relatório leva ~1 s

**`npm run carga`**: o sistema inteiro escala?

```bash
cd e2e && npm run carga -- 12 90
```
1 worker: 28,9 s · 3 workers: 12,2 s · 5 workers: 12,2 s

---

## Quando (não) usar Kafka

**Use** para:
- tarefas longas fora da requisição
- eventos que vários serviços precisam saber
- absorver picos · integrar sistemas que caem

**Evite** quando:
- o usuário precisa da resposta **agora** (login, frete)
- volume pequeno, um serviço só → tabela `jobs` ou BullMQ (Redis)
- ninguém vai monitorar lag, disco e réplicas

---

## Kafka × RabbitMQ × Redis

| | Kafka | RabbitMQ | Redis / BullMQ |
| --- | --- | --- | --- |
| Modelo | log | fila | memória |
| Depois de lida | fica | apaga | depende |
| Reprocessar | sim | não | só Streams |
| Retry, atraso, prioridade | você faz | nativo | nativo |
| Operação | pesada | média | leve |

**Regra prática**: fila para "faça isto", Kafka para "isto aconteceu"

---

## Para levar

1. `202 Accepted` + fila: a requisição só **anota** o pedido
2. **Partições** = paralelismo e ordem; **grupos** = dividir ou repetir
3. **At-least-once**: tudo precisa ser **idempotente**
4. Tarefa longa → **heartbeat**; desligar → `disconnect()`
5. Mensagem é contrato: **valide** e evolua só acrescentando campos
6. Kafka é **adaptador**: o domínio não muda

---

<!-- _class: titulo -->

# Perguntas?

Leitura: `kafka-leitura.md` · Decisões: `modelagem.md` · Código: `relatorios/`
