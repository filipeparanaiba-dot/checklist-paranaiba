# Histórico de mudanças

Todas as mudanças relevantes deste projeto são registradas aqui.

## 22.0.0 — 2026-07-28

- aplicativo operacional Android/iOS e painel gerencial separados;
- API com RBAC por unidade, avaliação server-side, idempotência e auditoria;
- modo offline com protocolo sem exposição de resultados;
- testes de autorização, separação de dados e produção;
- documentação de API, implantação, dispositivos e ameaças.

## 21.0.1 — 2026-07-28

### Corrigido

- navegação e ações agora funcionam em navegadores incorporados que não
  oferecem `Element.closest`;
- foco e rolagem possuem alternativas compatíveis com implementações mais
  antigas;
- cache offline atualizado para distribuir imediatamente a correção.

## 21.0.0 — 2026-07-28

### Adicionado

- todos os 13 módulos funcionais e acessíveis;
- auditorias e manutenção antes ausentes;
- persistência local de demonstração em IndexedDB;
- backup JSON e exportação CSV;
- testes de regras e estrutura;
- servidor Node.js portátil e defensivo;
- ícones locais e imagem social;
- documentação de arquitetura, operação e segurança;
- integração contínua no GitHub.

### Alterado

- estado e indicadores agora são derivados e isolados por loja;
- PWA usa cache versionado limitado ao projeto;
- navegação móvel dá acesso a todos os módulos;
- formulários agora usam validação e semântica adequada;
- treinamento, EPI, preços e avisos usam linguagem compatível com o que realmente
  acontece.

### Removido

- confirmações falsas de envio ao VR, WhatsApp e servidor;
- “assinatura digital” simulada;
- “certificação Anvisa” simulada;
- `innerHTML` com dados de usuário;
- handlers JavaScript inline;
- dependência `lucide@latest` e outros ativos remotos;
- limpeza global de Cache Storage e autodesregistro do service worker;
- caminho absoluto no servidor PowerShell.
# Detalhes da versão 22

### Adicionado

- aplicativo operacional separado, com projetos nativos Android e iOS;
- fluxo de tarefas, uma pergunta por tela, revisão e comprovante sem resultado;
- salvamento automático e fila offline com envio idempotente;
- API autenticada, banco transacional, RBAC por unidade e auditoria;
- avaliação autoritativa no servidor e criação automática de planos de ação;
- painel gerencial conectado aos resultados;
- contratos compartilhados que excluem regras, pesos e notas do aplicativo;
- testes de isolamento de dados, autorização e idempotência;
- documentação de API, dispositivos móveis, implantação e ameaças.

### Segurança

- autenticação de demonstração desativada automaticamente em produção;
- tokens não são persistidos pelo aplicativo operacional;
- regras de avaliação nunca são enviadas ao pacote do colaborador;
- cabeçalhos defensivos, limite de corpo, CORS explícito e respostas sem cache.

---
