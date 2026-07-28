# Arquitetura e decisões

## Visão atual

A versão 21 é uma aplicação web estática com regras separadas da interface:

```text
Interface HTML
    │
    ├── app.js ── fluxos, eventos e renderização segura
    │      │
    │      ├── core.js ── regras puras
    │      └── db.js ── rascunhos IndexedDB
    │
    ├── sw.js ── shell offline
    └── server.mjs ── entrega local com cabeçalhos defensivos
```

Não há backend corporativo nesta versão. IndexedDB é usado somente para
rascunhos de demonstração do dispositivo.

## Princípios

### Verdade operacional

Uma ação só pode receber estado de sucesso quando o sistema responsável
confirmar o resultado. Por isso:

- produto pode ficar “aguardando backend”, nunca “alterado no VR”;
- aviso pode ser salvo como rascunho, nunca “entregue”;
- EPI pode ser rascunho, nunca “assinado digitalmente”;
- treinamento pode ser concluído internamente, nunca “certificado pela Anvisa”.

### Dados por unidade

Toda entidade criada inclui `storeId`. Os módulos filtram registros pela unidade
selecionada e os indicadores são derivados desse mesmo conjunto.

### Renderização segura

Dados de formulário são normalizados e adicionados ao DOM com `textContent` e
propriedades de elementos. Não existe interpolação de entrada em HTML ou código.

### Estado derivado

Contadores, índice de saúde, ranking e indicadores não são textos fixos. Eles
são recalculados a partir dos registros atuais.

## Entidades

- `audits`: auditorias e respostas;
- `actions`: planos 5W2H;
- `incidents`: furtos, avarias e quebras;
- `epiDeliveries`: rascunhos de entrega de EPI;
- `receivingAudits`: avaliações de carga;
- `maintenanceTickets`: chamados;
- `checklistTemplates`: modelos e perguntas;
- `products`: produtos em tratamento de perdas;
- `trainingCompletions`: conclusões internas;
- `notificationDrafts`: rascunhos de comunicação;
- `activity`: histórico resumido da demonstração.

## Arquitetura-alvo

Para produção, o navegador deixa de ser a fonte da verdade:

```text
PWA
 │
 ├── outbox local idempotente
 │
 ▼
API autenticada
 │
 ├── autorização por loja e função
 ├── validação autoritativa
 ├── trilha append-only
 ├── banco transacional
 └── fila de integrações
        ├── VR Software
        └── provedor de mensagens
```

Cada mutação deve usar UUID, chave idempotente, versão e resposta confirmada.
Dados locais só podem ser removidos após confirmação do servidor.

## Arquitetura implementada na versão 22

```text
apps/operator (Android/iOS)
  ├─ tarefas e perguntas públicas
  ├─ rascunhos e fila offline
  └─ recebe somente protocolo
            │ HTTPS + token
            ▼
services/api
  ├─ RBAC por função e unidade
  ├─ validação e idempotência
  ├─ regras/pesos privados
  ├─ avaliação transacional
  ├─ planos de ação
  └─ auditoria
            │
            ▼
apps/manager
  └─ notas, desvios e indicadores
```

`packages/contracts` é a fronteira pública. Qualquer campo adicionado ali pode
chegar ao dispositivo; por isso avaliações e regras pertencem apenas ao modelo
interno da API.

## Decisões futuras obrigatórias

- provedor de identidade;
- banco e política de backup;
- contratos das APIs VR e mensagens;
- retenção de nomes, matrículas, ocorrências e evidências;
- política de consentimento e acesso a CFTV;
- aprovação de alterações abaixo do custo;
- conteúdo e responsável técnico por treinamentos;
- estratégia de anexos e armazenamento de imagens.
