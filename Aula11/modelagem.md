# Modelagem: relatórios assíncronos com Kafka

Este documento discute a modelagem do projeto [`relatorios/`](relatorios/): o que foi proposto, por que ela faz sentido, o que precisou ser ajustado e quais dúvidas costumam aparecer.

## 1. A proposta

> Um serviço de relatório consolida vendas com um filtro específico. Como os relatórios são pesados (vamos simular o peso), o tempo de execução é alto. Então um serviço à parte processa de forma assíncrona, a partir de um pedido enfileirado no Kafka, gera o relatório e o deixa disponível no S3. Ao terminar, publica no Kafka uma mensagem que outro serviço monitora para avisar o usuário.

## 2. Faz sentido? Sim

É um padrão conhecido, com nome: ***Asynchronous Request-Reply***. O cliente faz o pedido, recebe um "aceito" na hora e descobre o resultado depois (consultando o status ou sendo avisado). Ele aparece sempre que o trabalho é longo demais para uma requisição: relatórios, exportações, processamento de vídeo, importação de planilhas.

Os três motivos para separar o trabalho da API valem aqui:

1. **O tempo não cabe numa requisição.** Um relatório de um ano passaria do timeout de qualquer proxy.
2. **A carga é diferente.** A API atende muitas requisições rápidas; o worker faz poucas tarefas pesadas. Cada um escala do seu jeito (`--scale relatorios-worker=3` não mexe na API).
3. **A falha é diferente.** Se o worker cair, os pedidos esperam no Kafka; a API continua aceitando pedidos.

## 3. O que foi ajustado na implementação

| Ponto | Proposta | Como ficou | Por quê |
| ----- | -------- | ---------- | ------- |
| Quantos serviços | "2 microsserviços" + "outro serviço que monitora" | **3**: `relatorios-api`, `relatorios-worker`, `notificacoes` | Cada um tem uma razão diferente para mudar e para escalar. São três *deployables*, cada um com o seu `package.json`, a sua imagem e o seu grupo de consumidores. |
| Quem conhece o status | (não especificado) | A **API** também consome `report.completed`/`report.failed` | Sem isso, `GET /reports/:id` não teria como responder `COMPLETED`. É o *fan-out*: o mesmo evento lido por dois grupos. |
| O que vai na mensagem de "pronto" | (não especificado) | Só a **referência** ao arquivo (`bucket` + `key`) e um resumo | Padrão ***Claim Check***: o arquivo fica no S3, a mensagem leva "o tíquete" para buscá-lo. O Kafka limita mensagens a 1 MB por padrão, e um CSV de relatório pode ter centenas de MB. |
| Link de download | (não especificado) | O e-mail aponta para a **API** (`/reports/:id/download`), que gera a *presigned URL* **na hora** e redireciona | A presigned URL expira (5 min no projeto). Se fosse na mensagem, o link do e-mail estaria morto quando o usuário o abrisse no dia seguinte. |
| Falha | (só o caminho feliz) | Tópico `report.failed` + 3 tentativas no worker | O usuário precisa saber que o relatório **não** vem. Sem isso, ele espera para sempre. |
| O "peso" | "vamos mockar" | `1 s + 15 ms × dias do período` | Peso proporcional ao filtro deixa a simulação mais realista e permite testes de carga curtos (períodos de 1 dia). |
| Paralelismo | (não especificado) | 3 partições por tópico | Permite demonstrar 1, 3 e 5 workers (e o 4º e 5º ociosos). |

## 4. Decisões e alternativas

| Decisão | Escolha | Alternativas e quando usá-las |
| ------- | ------- | ----------------------------- |
| Chave das mensagens | `reportId` | `email`: garante ordem por usuário, mas um usuário com muitos pedidos ocupa uma partição. Sem chave: distribuição uniforme sem ordem. |
| Tópicos de resultado | Dois (`completed` e `failed`) | Um só (`report.finished` com `status`). Um tópico garante a ordem entre "falhou" e "concluiu" do mesmo relatório; dois deixam cada consumidor assinar só o que lhe interessa. |
| Onde a API guarda o status | Memória | Redis ou PostgreSQL. Obrigatório para ter mais de uma instância da API (ver dúvida 14). |
| Como o usuário descobre | *Polling* (`GET /reports/:id`) + e-mail | WebSocket ou SSE (o servidor empurra; veja [`AulaWebSocket/`](../AulaWebSocket/)), *webhook* (para integrações entre sistemas), push no celular. |
| Formato do arquivo | CSV | XLSX, PDF, Parquet. Muda só o worker. |
| Biblioteca | `kafkajs` | `@confluentinc/kafka-javascript`: mantida, mais rápida, API compatível. O `kafkajs` não tem versão nova desde 2023, mas é a mais didática. |
| Storage | RustFS (compatível com S3) | MinIO, LocalStack, S3 da AWS. O código usa o SDK oficial da AWS, então qualquer um funciona. |

## 5. Principais dúvidas

### Sobre a arquitetura

**1. Por que não deixar a API processar em segundo plano, sem `await` (*fire and forget*)?**

```ts
router.post('/reports', (req, res) => {
  gerarRelatorio(req.body);   // sem await
  res.status(202).json(...);
});
```

Funciona até o primeiro problema: se a API reiniciar (deploy, queda), os relatórios em andamento **somem** sem ninguém saber; os relatórios disputam CPU e memória com as requisições HTTP; não há como limitar quantos rodam ao mesmo tempo; e para gerar mais relatórios é preciso escalar a API inteira. A fila dá **durabilidade** (o pedido está gravado), **controle de vazão** (os workers puxam no seu ritmo) e **escala independente**.

**2. Por que `202 Accepted` e não `201 Created`?**

`201` diz "o recurso foi criado e está pronto". `202` diz "aceitei o pedido, mas o processamento ainda não terminou". O header `Location` diz onde acompanhar.

**3. Por que o worker não chama a API (HTTP) para avisar que terminou?**

Porque aí o worker precisaria conhecer a API (URL, autenticação), e também o serviço de notificações, e também o próximo interessado que aparecer. Se a API estivesse fora do ar no momento, o aviso se perderia. Publicando um **evento**, o worker só diz o que aconteceu; quem quiser reagir, assina o tópico.

**4. Por que Kafka, e não RabbitMQ ou uma fila no Redis (BullMQ)?**

Para esta tarefa isolada, BullMQ ou RabbitMQ resolveriam com menos infraestrutura, e com novas tentativas, atraso e prioridade prontos. O Kafka se paga quando os eventos interessam a **vários** serviços e vale a pena **guardá-los** (reprocessar, auditar, alimentar novos serviços). Na aula, ele foi escolhido para estudar o modelo de log, partições e grupos de consumidores. Comparação completa: [`kafka-leitura.md` §12](kafka-leitura.md#12-kafka--rabbitmq--redis).

**5. Isso é microsserviço ou é só um sistema distribuído?**

São três processos que fazem deploy separado, escalam separado e só se conhecem pelo contrato das mensagens: é o que define microsserviços na prática. O que ainda falta para um ambiente real: cada serviço com o **seu** banco (hoje a API guarda em memória), autenticação e observabilidade (logs centralizados, *tracing* entre serviços).

### Sobre o Kafka

**6. Quantas partições criar?**

O número de partições é o **máximo** de consumidores trabalhando em paralelo num grupo. Comece pelo paralelismo que você espera precisar no pico (com folga). Aumentar depois é possível, mas muda o destino das chaves; diminuir não é possível. Partições demais também custam (arquivos abertos, rebalanceamentos mais lentos).

**7. O que acontece com mais workers do que partições?**

Os excedentes ficam **ociosos**. No projeto, com 5 workers e 3 partições, dois imprimem `NENHUMA partição (ocioso)`, e o tempo total é o mesmo de 3 workers (12,2 s). Eles servem só de reserva: se um worker cair, um ocioso assume a partição.

**8. Com 3 workers, por que não ficou 3x mais rápido?**

Porque as chaves (`reportId`, aleatórios) não se dividem igualmente: na medição, as partições receberam 5, 4 e 3 relatórios. O tempo total é o da partição mais carregada. Com muitos pedidos, a distribuição tende a se equilibrar.

**9. Um relatório gigante atrasa os outros?**

Sim, os que estão **na mesma partição, atrás dele**. Dentro de uma partição, o consumo é em ordem, um por vez (*head-of-line blocking*). Alternativas: mais partições; um tópico separado para relatórios pesados (`report.requested.heavy`) com workers próprios; ou processar várias mensagens de uma partição em paralelo, abrindo mão da ordem.

**10. E se o relatório demorar mais que o session timeout (30 s)?**

O Kafka acharia que o worker morreu e daria a partição para outro, que começaria o **mesmo** relatório. Por isso o worker manda `heartbeat()` a cada etapa. Para tarefas de muitos minutos, outra opção é o worker só **registrar** o pedido (commit imediato) e processar fora do laço do consumidor, controlando o estado em outro lugar.

### Sobre falhas

**11. E se o Kafka estiver fora do ar quando a API for publicar?**

O `RequestReport` grava o relatório, tenta publicar e, se falhar, marca o relatório como `FAILED` e responde `503`. O problema é que são **duas gravações em dois sistemas** (repositório e Kafka), o chamado *dual write*: se a API cair **entre** as duas, o relatório fica `PENDING` para sempre. A solução completa é o ***Transactional Outbox***: gravar o pedido e a mensagem a publicar na **mesma transação do banco** (tabela `outbox`), e um processo separado ler essa tabela e publicar no Kafka. Ficou fora do escopo, mas é a evolução natural.

**12. E se o worker cair no meio do relatório?**

O offset não foi confirmado. Depois do session timeout, outro worker do grupo recebe a partição e processa a mesma mensagem de novo. Medido: `docker kill` no meio de um relatório de 6,5 s → pronto em 39 s, por outro worker. Com `docker stop` (desligamento limpo), o worker termina o que estava fazendo antes de sair: pronto em 7 s.

**13. E se a mesma mensagem chegar duas vezes?**

Vai chegar: o Kafka garante *at-least-once*. Por isso cada passo é **idempotente**: o worker sempre grava no mesmo arquivo (`reports/<id>.csv`), a API só muda o status de `PENDING` uma vez e o serviço de notificações registra `completed:<reportId>` antes de enviar o e-mail. Detalhes: [`kafka-leitura.md` §7](kafka-leitura.md#7-garantias-de-entrega-e-idempotência).

**14. Dá para ter duas instâncias da API?**

Hoje, não. As duas estariam no mesmo grupo (`relatorios-api`) e o Kafka dividiria as partições de `report.completed` entre elas. Um relatório pedido na instância A poderia ter o `completed` lido pela instância B, e a A nunca saberia que ficou pronto. Para escalar a API, o `InMemoryReportRepository` precisa virar Redis ou PostgreSQL, compartilhado entre as instâncias. Graças à porta `ReportRepository`, só esse adaptador muda.

**15. O que acontece com uma mensagem mal formada?**

Os consumidores validam com Zod. Se a mensagem não segue o contrato, ela é **registrada e ignorada**. Lançar erro seria pior: o `kafkajs` tentaria de novo para sempre e a partição pararia (*poison pill*). Em produção, ela iria para um tópico de mensagens mortas (DLQ) para alguém analisar.

### Sobre o contrato entre os serviços

**16. Os três serviços têm uma cópia do `events.ts`. Não seria melhor um pacote compartilhado?**

É uma escolha. Cópias deixam cada serviço independente (deploy, versão de dependências, linguagem) e obrigam a pensar em compatibilidade. Um pacote compartilhado (`@loja/contratos`) evita divergência, mas acopla o ciclo de deploy. Em sistemas maiores, o contrato vira um **schema** (Avro, Protobuf ou JSON Schema) num ***Schema Registry***, que recusa mudanças incompatíveis.

**17. Como mudar o contrato sem quebrar quem consome?**

Só **acrescente** campos, e opcionais. O Zod ignora campos desconhecidos por padrão, então consumidores antigos continuam funcionando (há um teste disso em `notificacoes`). Para uma mudança incompatível, crie um tópico novo (`report.completed.v2`), publique nos dois durante a migração e desligue o antigo quando ninguém mais o ler.

### Sobre o produto

**18. E se o usuário pedir o mesmo relatório 10 vezes?**

Hoje, gera 10 relatórios. Melhorias possíveis: a API calcula uma chave a partir dos filtros (`hash(email + filtros)`) e, se já existir um relatório `PENDING` ou recente com a mesma chave, devolve o existente. É uma forma de idempotência na **entrada**.

**19. Dá para cancelar?**

Não no projeto. Seria um `DELETE /reports/:id` que marca `CANCELLED` e publica `report.cancelled`; o worker, antes de começar (e a cada etapa), consulta se o relatório foi cancelado. Não dá para "tirar" uma mensagem do Kafka.

**20. Quem tem o link baixa o arquivo?**

Durante 5 minutos, sim: a presigned URL dispensa credenciais. Por isso ela é gerada só quando o usuário clica, e em produção a rota `/reports/:id/download` exigiria login e verificaria se o relatório é daquele usuário. Os arquivos também deveriam expirar no S3 (*lifecycle rule*, por exemplo: apagar depois de 7 dias).

## 6. O que ficou de fora (de propósito)

| Tema | Onde entraria |
| ---- | ------------- |
| *Transactional Outbox* | `RequestReport` (dúvida 11) |
| DLQ e *retry topics* | Consumidores (dúvida 15) |
| Persistência do status | `ReportRepository` com Redis/PostgreSQL (dúvida 14) |
| Autenticação | Rotas da API, rota de download |
| *Schema Registry* | Contrato (dúvida 16) |
| Observabilidade | *Tracing* distribuído (OpenTelemetry) com o `reportId` como correlação |
| Cluster com 3 brokers e replicação 3 | `docker-compose.yml` |
