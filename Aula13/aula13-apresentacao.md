---
marp: true
theme: default
paginate: true
title: "Aula 13 — Escalabilidade horizontal: Kubernetes, Terraform e teste de carga"
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
Texto completo para estudo: aula13.md, kubernetes.md e infra-como-codigo.md
-->

<!-- _class: titulo -->

# Escalabilidade horizontal

### Kubernetes, Terraform e teste de carga

Web II · Aula 13

---

## Onde paramos

- **Aula 10**: Redis para estado compartilhado entre **várias instâncias**
- **Aula 11**: Kafka para tirar trabalho pesado da requisição
- **Aula 12**: testes, Docker, Compose, migrations, deploy, rollback

**Aula 13**: o **mesmo** sistema de tarefas, agora:

- num **Kubernetes** local (k3d)
- com a infraestrutura em **Terraform** (parametrizada)
- **escalando sozinho** durante um teste de carga (k6)

---

## O problema

O relatório de tarefas gasta CPU (~19 ms por pedido).

```
60 req/s × 60% relatórios × 19 ms  ≈  690m de CPU necessários
                       1 pod da API =  500m de CPU disponíveis
```

**Medido, com 1 pod:**

| | |
| --- | --- |
| p95 do relatório | **10 s** (timeout) |
| p95 da listagem (quase sem CPU!) | **10 s** |
| Erros | **9,2 %** |

Faltar capacidade não deixa "um pouco mais lento": **a fila cresce sem fim**

---

## Escalar: para cima ou para os lados?

```
VERTICAL (scale up)                     HORIZONTAL (scale out)

┌────────┐     ┌─────────┐                               ┌─────┐
│  API   │ ──▶ │   API   │                          ┌───▶│ API │
│ 1 core │     │ 4 cores │                          │    └─────┘
└────────┘     └─────────┘                          │    ┌─────┐
                                        balanceador ┼───▶│ API │
                                                    │    └─────┘
                                                    │    ┌─────┐
                                                    └───▶│ API │
                                                         └─────┘
```

| | Vertical | Horizontal |
| --- | --- | --- |
| Limite | o maior servidor (e o preço) | os recursos compartilhados |
| Uma falha | cai tudo | as outras cópias atendem |
| Exige da app | nada | ser **sem estado** |

---

## Node.js: uma thread só

```ts
// application/tasks.ts
const signature = pbkdf2Sync(JSON.stringify(summary), 'relatorio-tarefas',
                             reportCpuCost, 32, 'sha256');   // SÍNCRONO
```

- Enquanto assina um relatório, o processo **não faz mais nada**
- Uma instância usa no máximo **~1 núcleo**, por maior que seja a máquina
- Escalar Node = **mais processos**

**Pré-requisito**: API **sem estado** (Aula 10). Sessão, lock ou cache em memória quebram com N cópias.
A API de tarefas guarda tudo no PostgreSQL: 1 ou 6 cópias, **zero mudança de código**.

---

## Kubernetes em uma frase

> Você declara o **estado desejado**; o cluster trabalha **sem parar** para que o real fique igual.

```
 desejado: replicas = 4          real: 3 pods rodando
           │                                │
           └────────▶ controller ◀──────────┘
                         │
                  "falta 1" → cria 1 pod
```

- Apagou um pod na mão? Aparece outro em segundos
- Não existe "crie mais um". Existe "agora o desejado é 4"
- Por isso, quem **mais** declara o desejado (HPA, Terraform) precisa ser **um só**

---

## Arquitetura de um cluster

```
┌───────────────────────── control plane ────────────────────────┐
│ api-server ◀── kubectl / Terraform                             │
│ etcd (estado) · scheduler · controllers (Deployment, Job, HPA) │
└──────────────┬─────────────────────────────────────────────────┘
               │
           ┌───┴──────────────────────┐
           │                          │
┌───────── nó ─────────┐   ┌───────── nó ─────────┐
│ kubelet · containerd │   │ kubelet · containerd │
│ kube-proxy           │   │ kube-proxy           │
│ (pod) (pod)          │   │ (pod)                │
└──────────────────────┘   └──────────────────────┘
```

**k3d**: um k3s (Kubernetes certificado e leve) com os **nós em contêineres Docker**

---

## Do Compose ao Kubernetes

| Aula 12 (compose) | Aula 13 (Kubernetes) |
| --- | --- |
| `.env` com a senha | **Secret** |
| `db` + volume `pgdata` | **StatefulSet** + **PersistentVolumeClaim** |
| `migrate` one-shot | **Job** `migrate-<versão>` |
| `api` + `HEALTHCHECK` | **Deployment** + readiness + liveness |
| `--scale api=3` | `replicas` ou **HPA** |
| nome `api` na rede | **Service** (DNS + IP virtual + balanceamento) |
| `ports: 8090:8080` | **Ingress** (Traefik) |
| `up --wait` | `tofu apply` (com `wait_for_rollout`) |

---

## O caminho de uma requisição

```
navegador / k6
     │ :8013
     ▼
LB do k3d ──▶ Traefik (Ingress) ──▶ Service web ──▶ web ×2 (nginx)
                                                      │ /api
                                                      ▼
                    HPA 1..6 ┄┄┄┄┄┄┄┄┄▶ Service api ──▶ api ×N
                                                      │
                                                      ▼
                                             db-0 (StatefulSet + PVC)
```

**O mesmo `nginx.conf` da Aula 12** (`proxy_pass http://api:3000`)
`api` agora é o **IP virtual** do Service: o kube-proxy espalha as conexões entre os pods **prontos**

---

## Resposta ao exercício 6 da Aula 12

`docker compose up --scale api=2` com o nginx na frente:

- nginx resolve `api` **uma vez**, na partida → um IP → **um contêiner**
- a segunda cópia fica ociosa

No Kubernetes:

```bash
$ scripts/quem-responde.sh
  11 api-544b9db967-5lxhj
  10 api-544b9db967-n7t7h
   9 api-544b9db967-4q2ch
```

Cabeçalho `X-Instance` em toda resposta · rodapé da tela: *atendido por api-…*

---

## Saúde: liveness × readiness

| Probe | Pergunta | Se falhar | No projeto |
| --- | --- | --- | --- |
| **liveness** | O processo vive? | **reinicia** o contêiner | `/api/health` (sem banco) |
| **readiness** | Pode receber tráfego? | **sai do Service** | `/api/ready` (testa o banco) |

- Pod novo criado pelo HPA só entra no rodízio quando **pronto**
- Liveness que testa o banco = banco cai → **todas** as APIs reiniciam em loop

A mesma distinção *health × ready* da Aula 12, agora com **consequências automáticas**

---

## Recursos: requests e limits

```hcl
resources {
  requests = { cpu = "250m", memory = "96Mi" }    # RESERVADO no nó
  limits   = { cpu = "500m", memory = "192Mi" }   # TETO
}
```

- `1000m` = 1 núcleo
- **request**: o scheduler só põe o pod num nó com isso livre · **base do HPA**
- **limit de CPU**: acima → **estrangulado** (throttling), fica lento
- **limit de memória**: acima → **morto** (`OOMKilled`)

Sem request de CPU → HPA mostra `<unknown>` e não escala

---

<!-- _class: titulo -->

# Infraestrutura como código

---

## Infra "clicada" × infra como código

| Sem IaC | Com IaC |
| --- | --- |
| Console web, cliques, wiki desatualizada | Arquivos `.tf` no git |
| "Quem mudou isso?" | `git log` + pull request revisado |
| Homologação ≠ produção | Mesmo código, outros **parâmetros** |
| Recriar leva dias | `tofu apply` em minutos |
| Mudança às cegas | `tofu plan` mostra **antes** |

**Terraform × OpenTofu**: em 2023 o Terraform mudou de licença; o **OpenTofu** é o fork aberto (Linux Foundation). Mesmo código, `tofu` no lugar de `terraform`.

---

## Os elementos do Terraform

```hcl
provider "kubernetes" { config_context = var.kube_context }   # o "driver"

variable "hpa_max" {                                           # parâmetro
  type    = number
  default = 6
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "api" {     # o que existe
  count = var.hpa_enabled ? 1 : 0                              # 0 ou 1
  spec {
    max_replicas = var.hpa_max
    scale_target_ref { name = kubernetes_deployment_v1.api.metadata[0].name }
  }                                    # ▲ referência = dependência implícita
}

output "url" { value = "http://localhost:8013" }               # resultado
```

---

## O ciclo: plan → apply

```
 .tf (desejado) ─┐
                 ├──▶ plan ──▶ diferença ──▶ apply
 state (criado) ─┤
 cluster (real) ─┘
```

Trocar a versão v1 → v2:

```
-/+ resource "kubernetes_job_v1" "migrate"
      ~ name = "migrate-v1" -> "migrate-v2" # forces replacement
  ~ resource "kubernetes_deployment_v1" "api"
      ~ image = "tarefas-api:v1" -> "tarefas-api:v2"
Plan: 1 to add, 2 to change, 1 to destroy.
```

**Ler o plan é a habilidade mais importante.** `-/+` num banco = apagar e criar vazio.

---

## O state

- O mapa entre **cada bloco do código** e **cada objeto real**
- Contém a **senha do banco em texto puro**, mesmo com `sensitive = true`

```bash
$ grep -c troque infra/terraform.tfstate
2
```

- **Nunca** no git (`.gitignore`)
- Em equipe: backend remoto **com lock** (S3, GCS, Terraform Cloud, Secret no cluster)
- `.terraform.lock.hcl` (versões dos providers) **vai** para o git

---

## Parametrização: cenários

O mesmo código, três infraestruturas:

```hcl
# cenarios/sem-hpa.tfvars       # cenarios/hpa-agressivo.tfvars
hpa_enabled  = false            hpa_enabled           = true
api_replicas = 1                hpa_min               = 1
                                hpa_max               = 6
                                hpa_cpu_target        = 60
                                hpa_scale_down_window = 30
```

```bash
scripts/cenario.sh sem-hpa             # → infra/cenario.auto.tfvars + apply
scripts/cenario.sh hpa-agressivo
scripts/tf.sh plan -var hpa_max=10     # "e se...?" sem aplicar
```

Precedência: `default` < `TF_VAR_*` < `terraform.tfvars` < `*.auto.tfvars` < `-var`

---

## Validar antes de tocar no cluster

```hcl
validation {                                  # numa variável
  condition     = var.hpa_cpu_target > 0 && var.hpa_cpu_target <= 100
}
precondition {                                # entre variáveis
  condition = var.hpa_max * var.db_pool_max <= var.db_max_connections - 5
}
```

```
$ scripts/tf.sh plan -var hpa_max=10
Error: Resource precondition failed
  Réplicas máximas × db_pool_max excede db_max_connections - 5
```

10 pods × 10 conexões = 100 → o Postgres recusaria no pico. **Nenhum recurso foi alterado.**

---

## Quem manda no número de pods?

```hcl
replicas = var.hpa_enabled ? null : var.api_replicas   # null = "não é meu"
```

| | `kubectl scale --replicas=4` |
| --- | --- |
| HPA ligado | o HPA traz de volta em ~1 min |
| HPA desligado | `tofu plan` → `~ replicas = "3" -> "1"` (**drift**) |

Com 5 pods criados pelo HPA: `tofu plan` → **No changes**

Mudou na mão para apagar incêndio? Leve para o código, ou o próximo `apply` desfaz.

---

<!-- _class: titulo -->

# Autoscaling e carga

---

## HPA: a fórmula

```
réplicas desejadas = ceil( réplicas atuais × uso médio / alvo )
```

Uso em **% do request** (250m) · alvo 60 % = ~150m por pod

**Medido** (60 req/s, cenário `hpa-agressivo`):

| t | Uso médio | Réplicas | Conta |
| --- | --- | --- | --- |
| 40 s | 82 % | 1 → 2 | ceil(1 × 82/60) = 2 |
| 55 s | 114 % | 2 → 4 | ceil(2 × 114/60) = 4 |
| 70 s | 129 % | 4 → 5 | (média no momento da decisão) |
| 100 s+ | 55–60 % | 5 | ceil(5 × 57/60) = 5 · estável |

---

## Por que leva ~1 minuto?

```
metrics-server coleta (~15 s) → HPA decide (15 s) → pod inicia
  → readiness passa → entra no Service
```

`behavior`: **sobe rápido, desce devagar**

| | Regra no projeto |
| --- | --- |
| Subir | dobra **ou** +4 pods a cada 15 s (o maior), sem esperar |
| Descer | no máximo metade a cada 15 s, após a janela (300 s / 30 s) |

Escalar **reage** à carga, não a **antecipa**. Picos súbitos → `hpa_min` maior ou escala agendada.

---

## Teste de carga: modelo aberto

```
taxa
 60 ┤        ┌──────── platô (2 min) ────────┐
 15 ┤ ┌──────┘                               └──┐
    └─┴────────────────────────────────────────┴──▶ tempo
```

- `ramping-arrival-rate`: requisições chegam numa **taxa**, rápido ou lento, como usuários reais
- Modelo **fechado** (N usuários em loop): sistema lento recebe **menos** carga e esconde o problema
- Mistura: 60 % relatório · 30 % listagem · 10 % criar + apagar
- Roda **fora** do cluster: k6 → LB → Traefik → nginx → API

---

## Como ler o resultado do k6

```
  █ THRESHOLDS
    http_req_duration{name:GET /api/tasks/report}
    ✓ 'p(95)<500' p(95)=43.09ms
    http_req_failed
    ✓ 'rate<0.01' rate=0.00%
```

- **p95**: 95 % das requisições levaram até X. A **média esconde a cauda**.
- **http_req_failed**: erros + timeouts (10 s)
- **dropped_iterations**: o k6 não conseguiu manter a taxa (o sistema travou)
- **Thresholds** = critérios de aceite → código de saída ≠ 0 se falharem (serve para CI)

---

## Resultados (mesma carga: pico de 60 req/s)

| Cenário | p95 relatório | p95 listagem | Erros | Pods |
| --- | --- | --- | --- | --- |
| `sem-hpa` | **10 s** | **10 s** | **9,2 %** | 1 |
| `hpa-agressivo` | **43 ms** | **6 ms** | **0 %** | 1 → 5 |
| + deploy v2 no meio | 42 ms | 6 ms | **0 %** (12.433 req) | ~5, trocados 1 a 1 |
| scale-down 5 → 1 (6 req/s) | 43 ms | 8 ms | **0 %** (637 req) | 5→4→2→1 em ~50 s |

**Por que a listagem quebrou sem HPA?** O event loop estava ocupado com relatórios: todas as requisições esperam **na mesma fila**.

---

## Remover pods sem erros

```
Kubernetes                    Service              Pod da API
    │── tira o pod da lista ──▶│                        │
    │── preStop: sleep 5 ─────────────────────────────▶│  (balanceadores
    │                          │                        │   param de enviar)
    │── SIGTERM ──────────────────────────────────────▶│ shutdown():
    │                          │                        │  termina o que está
    │◀───────────────────────────────── exit 0 ─────────│  em andamento
    │   (se passar de 20 s: SIGKILL)
```

Três peças juntas: **readiness** + **preStop** + **graceful shutdown** (o `shutdown()` da Aula 12)

---

## Onde a escala horizontal para

| Gargalo | O que se faz |
| --- | --- |
| **Banco único** | índices, cache (Aula 10), réplicas de leitura, filas (Aula 11) |
| **Conexões** (6 × 10 de 100) | `precondition`, pool menor, PgBouncer |
| **Limit de CPU** | alvo do HPA **abaixo** do teto (60 % < 200 %) |
| **Nós cheios** → `Pending` | Cluster Autoscaler / Karpenter (na nuvem) |
| **Tempo de reação** (~1 min) | `hpa_min` maior, escala agendada |
| **Estado em memória** | Redis, banco |

**Atenção:** os 3 nós do k3d dividem a **mesma** CPU. O mecanismo é real; o ganho de hardware, não.

---

## Demonstração

```bash
cd Aula13/tarefas && cp .env.example .env
scripts/cluster-up.sh                 # ~45 s
scripts/deploy.sh v1                  # ~50 s → http://localhost:8013
scripts/observar.sh                   # outro terminal (ou: k9s -n tarefas)

scripts/cenario.sh sem-hpa       && scripts/carga.sh    # ✗
scripts/cenario.sh hpa-agressivo && scripts/carga.sh    # ✓
PICO=6 PLATO=90s RAMPA=5s scripts/carga.sh              # scale-down, 0 erros

scripts/deploy.sh v2                  # durante a carga: rolling update
scripts/rollback.sh                   # volta em segundos
scripts/cluster-down.sh               # apaga cluster + state
```

---

## Quando **não** usar Kubernetes

**Custos**: curva de aprendizado, YAML/HCL, upgrades do cluster, rede, observabilidade, segurança

**Alternativas** para sistema pequeno e tráfego previsível:
- VM + Docker Compose bem feito (Aula 12)
- PaaS: Cloud Run, Render, Fly.io, App Runner (escalam sem você ver um nó)

**Compensa** com: muitos serviços · várias equipes · autoscaling · resiliência a falha de máquina · portabilidade entre nuvens

---

## Indo além: o que estudar depois

**Deveria** (base de quem coloca sistemas no ar)
- **Observabilidade**: Prometheus, Grafana, OpenTelemetry, SLO
- **Desempenho**: Lei de Little `L = λ × W`, profiling, `worker_threads`
- **Entrega**: Helm/Kustomize, GitOps (Argo CD), canary
- **Segurança**: RBAC, NetworkPolicy, segredos fora do state
- **Nuvem**: EKS/GKE com Terraform (e `tofu destroy` no fim!)

**Poderia** (aprofundar)
KEDA · Karpenter · VPA · PgBouncer/CloudNativePG · caos · Gateway API · service mesh

<span class="small">Trilha, livros e certificações (KCNA → CKAD): seção 10 do `aula13.md`</span>

---

## Para levar

1. Escala horizontal exige **API sem estado**; Node escala com **mais processos**
2. Kubernetes = **desejado × real** em laço: um dono por campo
3. **Service** balanceia entre pods **prontos**; readiness ≠ liveness
4. HPA: `ceil(atual × uso/alvo)`, em % do **request**, com ~1 min de atraso
5. Terraform: **leia o plan**, proteja o **state**, detecte **drift**, valide com `precondition`
6. Teste de carga em **modelo aberto**, julgado por **p95** e **thresholds**
7. Capacidade < demanda = **colapso**, não lentidão

---

<!-- _class: titulo -->

# Perguntas?

Leitura: `aula13.md` · `kubernetes.md` · `infra-como-codigo.md` · Código: `tarefas/`
