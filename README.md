# Super Checklist Paranaíba

![Super Checklist Paranaíba](assets/og.png)

Aplicação web offline-first para demonstrar rotinas operacionais, auditorias,
planos de ação e prevenção de perdas nas duas unidades do Supermercado
Paranaíba.

> **Status:** demonstração local segura. Os dados gravados no navegador não são
> registros corporativos. VR Software, WhatsApp, autenticação e assinatura
> digital ainda não possuem backend autorizado.

## O que existe na versão 21

- 13 módulos navegáveis em desktop e celular;
- auditorias com respostas obrigatórias e geração de planos de ação;
- cadastro local de ocorrências, EPI, recebimentos, manutenção e produtos
  críticos;
- criador de checklists que salva todas as perguntas;
- indicadores calculados por unidade;
- margem residual em formato brasileiro;
- planos 5W2H com conclusão e contadores consistentes;
- rascunhos locais de avisos;
- exportação CSV e backup JSON;
- cache offline versionado;
- interface sem dependências executáveis externas;
- foco visível, zoom permitido, formulários associados e suporte a redução de
  movimento;
- servidor local portátil com cabeçalhos de segurança;
- testes automatizados e integração contínua.

## Matriz de capacidades

| Capacidade | Situação atual | O que falta para produção |
| --- | --- | --- |
| Auditorias e 5W2H | Funcional no dispositivo | API, banco corporativo e trilha de auditoria |
| Rascunhos offline | IndexedDB local | Outbox de servidor com idempotência e reconciliação |
| Alteração de preço | Apenas preparação local | Contrato e credenciais da API VR, aprovação e confirmação |
| WhatsApp | Apenas rascunho local | Provedor autorizado, templates, consentimento e recibos |
| EPI | Rascunho local | Identidade, reautenticação, evidência e assinatura válida |
| Treinamento | Conteúdo textual demonstrativo | Conteúdo aprovado, mídia, legendas e gestão de versões |
| PDF | Não implementado | Gerador de documentos e validação do modelo |
| Autenticação | Não implementada | Provedor de identidade e perfis por unidade/função |
| IA visual | Não implementada | Dataset, modelo validado, consentimento e monitoramento |

Mensagens da interface seguem essa matriz: nenhuma ação externa é apresentada
como concluída sem confirmação real.

## Executar localmente

### Requisitos

- Node.js 22 ou superior;
- navegador atualizado.

### Servidor recomendado

```powershell
node server.mjs
```

No Windows também é possível usar:

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

Abra `http://127.0.0.1:8085`.

O servidor usa apenas módulos nativos do Node.js. Não há dependências para
instalar.

## Validar

```powershell
node --check app.js
node tests/core.test.js
node tests/structure.test.js
```

Ou, quando `npm` estiver disponível:

```powershell
npm run validate
```

Os testes verificam regras financeiras, EAN-13, classificação do índice,
isolamento por loja, presença dos 13 módulos, ausência de handlers inline,
recursos executáveis locais, PWA e cabeçalhos defensivos.

## Dados locais e backup

O ambiente usa IndexedDB exclusivamente como espaço de demonstração do
dispositivo. A barra lateral permite:

- exportar um backup JSON;
- importar um backup compatível;
- reiniciar os dados de demonstração.

Não utilize esse armazenamento como fonte oficial. Registros corporativos
precisam de backend, controle de acesso, retenção, logs e cópias de segurança.

## PWA e modo offline

O service worker armazena somente o shell local da aplicação e remove apenas
caches com o prefixo do próprio projeto. Ao ficar sem conexão:

- os módulos continuam abrindo;
- rascunhos continuam sendo salvos no dispositivo;
- nenhuma mensagem de “sincronização concluída” é exibida;
- integrações externas permanecem bloqueadas.

O sistema não confunde `navigator.onLine` com disponibilidade de uma API.

## Segurança

As principais proteções da versão atual são:

- nenhuma entrada do usuário é interpolada com `innerHTML`;
- eventos são registrados em JavaScript, sem `onclick` inline;
- não há scripts `@latest` ou CDNs executáveis;
- Content Security Policy restrita a recursos locais;
- caminhos do servidor são normalizados e contidos na pasta do projeto;
- `.git` e outros caminhos ocultos não são publicados;
- campos críticos possuem limites e validação;
- ações externas são bloqueadas ou rotuladas como rascunho.

Consulte [SECURITY.md](SECURITY.md) para limites e reporte responsável.

## Arquitetura

```text
index.html        Interface semântica e todos os módulos
styles.css        Design system responsivo e acessível
app.js            Controladores, renderização segura e fluxos
core.js           Regras de negócio puras e testáveis
db.js             Rascunhos locais e backup
sw.js             Cache offline versionado
server.mjs        Servidor estático portátil
assets/           Ícones e imagem social locais
tests/            Testes de regras e estrutura
docs/             Arquitetura, operação e diário de implementação
```

Detalhes e fronteiras estão em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentação da modernização

- [Diário de implementação](docs/IMPLEMENTATION_LOG.md)
- [Arquitetura e decisões](docs/ARCHITECTURE.md)
- [Guia operacional](docs/OPERATIONS.md)
- [Histórico de versões](CHANGELOG.md)
- [Como contribuir](CONTRIBUTING.md)
- [Política de segurança](SECURITY.md)

## Roadmap para produção

1. Definir proprietário de dados, política LGPD e matriz de acesso.
2. Implementar backend com banco transacional e trilha append-only.
3. Integrar um provedor de identidade e RBAC por unidade/função.
4. Criar outbox idempotente para operação offline e reconciliação.
5. Integrar VR Software em sandbox, com dupla aprovação de preço.
6. Integrar o provedor de mensagens com templates e recibos.
7. Aprovar conteúdo POP, mídia, legendas e regras de conclusão.
8. Adicionar observabilidade, backup, recuperação e testes de carga.
9. Realizar avaliação de segurança e acessibilidade antes do piloto.

## Licença

O repositório ainda não declara uma licença. O proprietário deve escolher e
publicar os termos antes de permitir reutilização externa.
