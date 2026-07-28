# Histórico de mudanças

Todas as mudanças relevantes deste projeto são registradas aqui.

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
