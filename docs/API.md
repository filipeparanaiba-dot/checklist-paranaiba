# API de checklists

## Execução local

```powershell
pnpm dev:api
```

A API inicia em `http://127.0.0.1:8095` e cria
`services/api/data/api.sqlite`.

## Rotas

| Método | Rota | Perfil | Retorno |
| --- | --- | --- | --- |
| `GET` | `/health` | público | disponibilidade |
| `POST` | `/v1/dev/session` | somente desenvolvimento | token local |
| `GET` | `/v1/me` | autenticado | usuário provisionado |
| `GET` | `/v1/operator/assignments` | colaborador | tarefas e perguntas |
| `POST` | `/v1/operator/executions` | colaborador | protocolo, sem avaliação |
| `GET` | `/v1/manager/dashboard` | gestor/admin | indicadores e avaliações |
| `POST` | `/v1/manager/assignments` | gestor/admin | nova atribuição |

O envio de execução exige o cabeçalho `Idempotency-Key`, com pelo menos 16
caracteres.

## Autenticação

Em desenvolvimento, existem as contas
`operador@paranaiba.local`, `gestor@paranaiba.local` e
`admin@paranaiba.local`.

Em produção, configure:

```text
NODE_ENV=production
AUTH_MODE=oidc
OIDC_ISSUER=https://identidade.exemplo
OIDC_AUDIENCE=checklist-paranaiba-api
CORS_ALLOWED_ORIGINS=https://painel.exemplo,capacitor://localhost,https://localhost
```

A API valida assinatura, emissor, audiência e algoritmo. A função e as unidades
vêm do banco; claims de privilégio do token não são confiados.

## Avaliação e persistência

As perguntas públicas não contêm regra nem peso. Ao receber uma execução, a API
carrega a versão atribuída, valida respostas, calcula a nota numa transação e
cria planos para desvios. A resposta ao colaborador contém somente protocolo.

SQLite atende desenvolvimento e piloto de instância única. Para múltiplas
réplicas, migre o modelo para PostgreSQL gerenciado mantendo transações,
restrições únicas e idempotência.
