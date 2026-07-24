# 🚀 Super Sistema de Checklist & Prevenção de Perdas — Supermercado Paranaíba

[![Status](https://img.shields.io/badge/status-active-emerald.svg)]()
[![VR Software](https://img.shields.io/badge/integration-VR%20Software-blue.svg)]()
[![WhatsApp Bot](https://img.shields.io/badge/bot-WhatsApp%20API-25D366.svg)]()
[![AI Vision](https://img.shields.io/badge/AI-Computer%20Vision-purple.svg)]()

Plano de ação e sistema de auditoria operacional, controle de qualidade de perecíveis e prevenção de perdas customizado para a rede **Supermercado Paranaíba** (2 Unidades: Loja 1 Centro e Loja 2 Bairro).

A solução reúne as melhores funcionalidades dos líderes de mercado:
- **Parla** *(antigo Checklist Fácil)*: Workflows auditáveis de Não Conformidades (Planos de Ação 5W2H) e matriz de rotinas diárias.
- **PariPassu** *(CLIC)*: Controle de qualidade em perecíveis (FLV/Açougue), laudos de recebimento na doca e amostragem.
- **Mvisia**: Visão computacional e Inteligência Artificial para leitura de termômetros, gôndolas e etiquetas.

---

## 📑 Sumário

- [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Módulos do Sistema](#-módulos-do-sistema)
- [Benchmark Comparativo](#-benchmark-comparativo)
- [Estrutura de Arquivos](#-estrutura-de-arquivos)
- [Como Executar Localmente](#-como-executar-localmente)
- [Roadmap de Desenvolvimento](#-roadmap-de-desenvolvimento)

---

## 📐 Visão Geral e Arquitetura

O sistema conecta gerentes de loja, encarregados de setor e a diretoria geral em uma única plataforma intuitiva e otimizada para smartphones e desktop.

```
                               ┌──────────────────────────────────────────────┐
                               │   SUPER SISTEMA DE CHECKLIST PARANAÍBA       │
                               └──────────────────────┬───────────────────────┘
                                                      │
         ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
         ▼                                            ▼                                            ▼
┌──────────────────┐                         ┌──────────────────┐                         ┌──────────────────┐
│  MÓDULO LOJA 1   │                         │  MÓDULO LOJA 2   │                         │ INTEGRADOR ERP   │
│  (Centro)        │                         │  (Bairro)        │                         │  (VR Software)   │
└────────┬─────────┘                         └────────┬─────────┘                         └────────┬─────────┘
         │                                            │                                            │
         └────────────────────────────────────────────┼────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │ GRUPOS DE WHATSAPP GESTORES  │
                                       │ • Resumos às 12:00 e 18:30    │
                                       │ • Alertas Críticos Imediatos │
                                       └──────────────────────────────┘
```

---

## 🔥 Funcionalidades Principais

### 1. 🛡️ Prevenção de Perdas com Preço de Custo & Margem Editável
- **Preço de Custo VR Software**: Exibe o preço de custo real do produto importado do ERP.
- **Sugestão Editável pelo Gerente**: Campo de entrada `R$ Input` permitindo que o gerente ajuste livremente a oferta promocional de queima de estoque.
- **Margem Residual % em Tempo Real**: Cálculo instantâneo `((Preço - Custo) / Preço) * 100` conforme o gerente digita o valor.
- **Disparo Direto para o VR Software**: Atualização imediata dos caixas ao autorizar o desconto.

### 2. 💬 Automação de WhatsApp para Grupos de Gestores
- **Resumos Periódicos (Daily Digest)**: Disparo automático de relatórios consolidados às 12:00 e às 18:30 no grupo da Loja 1, Loja 2 ou Diretoria.
- **Push de Alertas Críticos**: Disparo imediato com foto e detalhes em caso de falha sanitária (ex: câmara fria > 4°C).

### 3. 👁️ Visão Computacional (IA Visual)
- **Leitura de Termômetros e Gôndola**: Análise de foto tirada no smartphone com *bounding box* automático e diagnóstico de não conformidade.

### 4. 📋 Matriz de Planos de Ação 5W2H
- Criação automática de tarefas (*What, Why, Who, When, How*) atribuídas ao responsável com controle de SLA.

### 5. 🎓 Microlearning POP (15 Segundos)
- Pop-ups de treinamento rápido em vídeo/infográfico exibidos quando ocorre uma falha operacional no açougue ou doca.

### 6. 🏆 Gamificação entre Lojas
- Ranking público do **Índice de Saúde da Loja (ISL)** estimulando a competição saudável entre Loja 1 e Loja 2.

---

## 📊 Benchmark Comparativo

| Funcionalidade | Parla | PariPassu | Mvisia | **Super Sistema Paranaíba** |
| :--- | :---: | :---: | :---: | :---: |
| Planos de Ação 5W2H | ✅ | ❌ | ❌ | **✅ Completo** |
| Laudos de Recebimento Perecíveis | ❌ | ✅ | ❌ | **✅ Completo** |
| IA Visual & OCR | ❌ | ❌ | ✅ | **✅ Completo** |
| Notificação Grupo WhatsApp | ❌ | ❌ | ❌ | **✅ Exclusivo** |
| Rebaixe com Margem de Custo VR | ❌ | ❌ | ❌ | **✅ Exclusivo** |
| Gamificação entre Lojas | ❌ | ❌ | ❌ | **✅ Exclusivo** |

---

## 📁 Estrutura de Arquivos

```text
Checklist Paranaiba/
├── index.html         # Interface Web Responsiva Desktop & Mobile UI
├── styles.css         # Design System Glassmorphic Dark Mode
├── app.js             # Lógica de Estado, Cálculo de Margem e Sincronização
├── server.ps1         # Servidor HTTP nativo em PowerShell (Porta 8085)
└── README.md          # Documentação Completa do Repositório GitHub
```

---

## 💻 Como Executar Localmente

### Opção 1: Servidor Local PowerShell (Recomendado)
Execute o comando abaixo no terminal da pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

Acesse no navegador:
👉 **`http://localhost:8085`**

### Opção 2: Abertura Direta do Arquivo
Abra o arquivo `index.html` em qualquer navegador web.

---

## 🗺️ Roadmap de Desenvolvimento

- [x] **Fase 1**: Protótipo UI/UX, Telas Mobile & Matriz 5W2H.
- [x] **Fase 2**: Módulo de Prevenção de Perdas com Margem de Custo & Sugestão Editável.
- [x] **Fase 3**: Simulação do Bot de WhatsApp para Grupos de Gestores.
- [ ] **Fase 4**: Conexão com a API GraphQL do VR Software oficial.
- [ ] **Fase 5**: Treinamento do Modelo YOLOv8 para Visão Computacional em câmeras fixas da loja.

---

*Desenvolvido para o Supermercado Paranaíba.*
