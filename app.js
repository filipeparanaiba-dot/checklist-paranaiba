import {
  APP_VERSION,
  MODULES,
  SECTOR_TEMPLATES,
  STORES,
  TRAINING_MODULES,
  calculateMargin,
  classifyHealth,
  createId,
  createInitialWorkspace,
  csvEscape,
  daysUntil,
  deriveStoreMetrics,
  formatCurrency,
  formatDate,
  formatNumber,
  normalizeText,
  toFiniteNumber,
  validateEan13,
} from "./core.js";
import {
  downloadWorkspaceBackup,
  loadWorkspace,
  parseWorkspaceBackup,
  resetWorkspace,
  saveWorkspace,
} from "./db.js";

const PAGE_META = Object.freeze({
  dashboard: {
    eyebrow: "Operação local",
    title: "Visão geral",
    subtitle: "Acompanhe rotinas e pendências com dados claramente identificados como demonstração.",
  },
  rotinas: {
    eyebrow: "Execução orientada",
    title: "Auditorias e setores",
    subtitle: "Responda todos os itens e gere planos de ação para não conformidades.",
  },
  treinamento: {
    eyebrow: "Desenvolvimento interno",
    title: "Treinamentos POP",
    subtitle: "Conteúdo de demonstração com perguntas coerentes e progresso local.",
  },
  furtos: {
    eyebrow: "Prevenção de perdas",
    title: "Furtos e avarias",
    subtitle: "Registre ocorrências locais sem prometer reserva automática de imagens ou baixa no ERP.",
  },
  epi: {
    eyebrow: "Segurança do trabalho",
    title: "Segurança e EPIs",
    subtitle: "Controle rascunhos de entrega sem apresentar matrícula digitada como assinatura digital.",
  },
  fornecedores: {
    eyebrow: "Qualidade no recebimento",
    title: "Doca e fornecedores",
    subtitle: "Registre temperatura, documentação e decisão de aceite com campos obrigatórios.",
  },
  analytics: {
    eyebrow: "Leitura operacional",
    title: "Indicadores e exportações",
    subtitle: "Indicadores calculados a partir dos registros locais da unidade selecionada.",
  },
  manutencao: {
    eyebrow: "Continuidade operacional",
    title: "Manutenção",
    subtitle: "Registre chamados locais com urgência, responsável e estimativa.",
  },
  builder: {
    eyebrow: "Rotinas personalizadas",
    title: "Criador de checklists",
    subtitle: "Crie modelos completos com perguntas e reutilize-os em auditorias locais.",
  },
  "5w2h": {
    eyebrow: "Tratamento de desvios",
    title: "Planos de ação 5W2H",
    subtitle: "Acompanhe o que, por que, quem e quando, mantendo os contadores consistentes.",
  },
  perdas: {
    eyebrow: "Validade e margem",
    title: "Prevenção de perdas",
    subtitle: "Calcule margens e prepare análises sem afirmar que preços foram enviados ao VR.",
  },
  whatsapp: {
    eyebrow: "Comunicação planejada",
    title: "Central de avisos",
    subtitle: "Crie rascunhos locais sem transmitir dados para serviços externos.",
  },
  ranking: {
    eyebrow: "Aprendizado entre unidades",
    title: "Comparativo entre lojas",
    subtitle: "Compare índices para direcionar apoio e compartilhar boas práticas.",
  },
});

const STATUS_LABELS = Object.freeze({
  approved: ["Aprovado", "success"],
  conditional: ["Com ressalva", "warning"],
  rejected: ["Rejeitado", "danger"],
  low: ["Programada", "success"],
  medium: ["Prioritária", "warning"],
  high: ["Crítica", "danger"],
  "not-sent": ["Não enviado", ""],
  prepared: ["Aguardando backend", "warning"],
});

let workspace = createInitialWorkspace();
let currentStore = "1";
let currentView = "dashboard";
let activeAudit = null;
let pendingConfirmation = null;
let toastTimer = null;
let persistenceAvailable = true;

const byId = (id) => document.getElementById(id);

function findDataTarget(startNode, attributeName) {
  let element = startNode instanceof Element ? startNode : startNode?.parentElement;
  while (element) {
    if (element.hasAttribute(attributeName)) return element;
    element = element.parentElement;
  }
  return null;
}

function focusMainContent() {
  const main = byId("main-content");
  try {
    main.focus({ preventScroll: true });
  } catch {
    main.focus();
  }
}

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = String(text);
  return element;
}

function appendTextCell(row, value, className = "") {
  const cell = createElement("td", className, value);
  row.append(cell);
  return cell;
}

function appendEmptyRow(tbody, columnCount, message) {
  const row = document.createElement("tr");
  const cell = createElement("td", "table-empty", message);
  cell.colSpan = columnCount;
  row.append(cell);
  tbody.append(row);
}

function statusLabel(key) {
  const [label, tone] = STATUS_LABELS[key] ?? [key, ""];
  return createElement("span", `status-label ${tone}`.trim(), label);
}

function sortNewest(items) {
  return [...items].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

function recordsForStore(collection) {
  return workspace[collection].filter((item) => item.storeId === currentStore);
}

function announce(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function addActivity(type, description, storeId = currentStore) {
  workspace.activity.unshift({
    id: createId("activity"),
    storeId,
    type,
    description: normalizeText(description, 240),
    createdAt: new Date().toISOString(),
  });
  workspace.activity = workspace.activity.slice(0, 200);
}

async function persist(message = "Alterações salvas neste dispositivo.") {
  const saveStatus = byId("save-status");
  saveStatus.textContent = "Salvando…";

  if (!persistenceAvailable) {
    saveStatus.textContent = "Somente nesta sessão";
    announce("O navegador bloqueou o armazenamento local. Os dados valem apenas nesta sessão.");
    return;
  }

  try {
    workspace = await saveWorkspace(workspace);
    saveStatus.textContent = "Salvo neste dispositivo";
    announce(message);
  } catch (error) {
    persistenceAvailable = false;
    saveStatus.textContent = "Falha ao salvar";
    console.error(error);
    announce("Não foi possível salvar neste dispositivo. Exporte um backup antes de fechar.");
  }
}

function navigate(viewId, { focus = true } = {}) {
  if (!MODULES.some((module) => module.id === viewId)) {
    announce("O módulo solicitado não existe.");
    return;
  }

  const target = byId(`view-${viewId}`);
  if (!target) {
    announce("Este módulo está indisponível nesta versão.");
    return;
  }

  document.querySelectorAll(".page-view").forEach((view) => {
    const isTarget = view === target;
    view.hidden = !isTarget;
    view.classList.toggle("is-active", isTarget);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    const isActive = button.dataset.view === viewId;
    button.classList.toggle("is-active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  const meta = PAGE_META[viewId];
  byId("page-eyebrow").textContent = meta.eyebrow;
  byId("page-title").textContent = meta.title;
  byId("page-subtitle").textContent = meta.subtitle;
  byId("module-select-mobile").value = viewId;
  currentView = viewId;
  try {
    window.scrollTo({ top: 0, behavior: "auto" });
  } catch {
    window.scrollTo(0, 0);
  }

  if (focus) {
    focusMainContent();
  }
}

function changeStore(storeId) {
  if (!STORES[storeId]) return;
  currentStore = storeId;
  document.querySelectorAll("[data-store-select]").forEach((select) => {
    select.value = storeId;
  });
  activeAudit = null;
  renderAll();
  navigate("dashboard", { focus: false });
  announce(`Unidade alterada para ${STORES[storeId].name}.`);
}

function renderDashboard() {
  const metrics = deriveStoreMetrics(workspace, currentStore);
  const health = classifyHealth(metrics.score);
  const healthLabel = byId("health-label");

  byId("health-score").textContent = metrics.score;
  byId("health-progress").value = metrics.score;
  byId("health-progress").textContent = `${metrics.score}%`;
  byId("conform-count").textContent = metrics.conform;
  byId("nonconform-count").textContent = metrics.nonconform;
  byId("audits-today").textContent = metrics.auditsToday;
  byId("open-actions").textContent = metrics.openActions;
  byId("protected-value").textContent = formatCurrency(metrics.protectedValue);

  healthLabel.textContent = health.label;
  healthLabel.className = `tone-chip ${health.tone}`;

  const pending = recordsForStore("products").filter(
    (item) => item.integrationStatus === "prepared",
  ).length;
  byId("pending-integrations").textContent = pending;
  byId("side-action-count").textContent = metrics.openActions;

  const activityContainer = byId("dashboard-activity");
  activityContainer.replaceChildren();
  const activities = sortNewest(recordsForStore("activity")).slice(0, 6);
  if (!activities.length) {
    activityContainer.append(createElement("p", "empty-message", "Nenhuma atividade registrada."));
    return;
  }

  activities.forEach((activity) => {
    const item = createElement("article", "timeline-item");
    const text = createElement("div");
    text.append(
      createElement("p", "", activity.description),
      createElement("small", "", formatDate(activity.createdAt, true)),
    );
    item.append(text, statusLabel(activity.type));
    activityContainer.append(item);
  });
}

function renderAuditRunner() {
  const empty = byId("audit-empty");
  const form = byId("audit-form");
  const list = byId("audit-question-list");
  list.replaceChildren();

  if (!activeAudit) {
    empty.hidden = false;
    form.hidden = true;
    return;
  }

  empty.hidden = true;
  form.hidden = false;
  byId("audit-title").textContent = activeAudit.title;
  byId("audit-subtitle").textContent = `${STORES[currentStore].name} · ${activeAudit.questions.length} itens obrigatórios`;

  activeAudit.questions.forEach((question, index) => {
    const fieldset = createElement("fieldset", "question-card");
    const legend = createElement("legend", "", `${index + 1}. ${question}`);
    const options = createElement("div", "response-options");
    [
      ["conform", "Conforme"],
      ["nonconform", "Não conforme"],
      ["na", "Não aplicável"],
    ].forEach(([value, label]) => {
      const option = createElement("label", "radio-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `audit-question-${index}`;
      input.value = value;
      input.required = true;
      option.append(input, document.createTextNode(label));
      options.append(option);
    });
    fieldset.append(legend, options);
    list.append(fieldset);
  });
}

function renderAuditHistory() {
  const tbody = byId("audit-table-body");
  tbody.replaceChildren();
  const audits = sortNewest(recordsForStore("audits"));
  if (!audits.length) {
    appendEmptyRow(tbody, 4, "Nenhuma auditoria concluída nesta unidade.");
    return;
  }

  audits.forEach((audit) => {
    const row = document.createElement("tr");
    const conform = audit.answers.filter((answer) => answer.choice === "conform").length;
    const nonconform = audit.answers.filter((answer) => answer.choice === "nonconform").length;
    appendTextCell(row, formatDate(audit.createdAt, true));
    appendTextCell(row, audit.title);
    appendTextCell(row, conform);
    appendTextCell(row, nonconform);
    tbody.append(row);
  });
}

function startAudit(templateKey, customTemplate = null) {
  const template = customTemplate ?? SECTOR_TEMPLATES[templateKey];
  if (!template || !Array.isArray(template.questions) || !template.questions.length) {
    announce("O modelo de checklist não possui perguntas válidas.");
    return;
  }

  activeAudit = {
    templateKey,
    title: normalizeText(template.title ?? template.name, 140),
    questions: template.questions.map((question) => normalizeText(question, 220)).filter(Boolean),
  };
  renderAuditRunner();
  navigate("rotinas");
}

async function submitAudit(event) {
  event.preventDefault();
  if (!activeAudit) return;

  const formData = new FormData(event.currentTarget);
  const answers = activeAudit.questions.map((question, index) => ({
    question,
    choice: formData.get(`audit-question-${index}`),
  }));
  if (answers.some((answer) => !answer.choice)) {
    announce("Responda todos os itens antes de finalizar.");
    return;
  }

  const now = new Date().toISOString();
  workspace.audits.push({
    id: createId("audit"),
    storeId: currentStore,
    templateKey: activeAudit.templateKey,
    title: activeAudit.title,
    answers,
    createdAt: now,
  });

  answers
    .filter((answer) => answer.choice === "nonconform")
    .forEach((answer) => {
      workspace.actions.push({
        id: createId("action"),
        storeId: currentStore,
        what: `Tratar não conformidade: ${answer.question}`,
        why: "Item marcado como não conforme durante auditoria local",
        who: "Responsável do setor",
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: "open",
        createdAt: now,
      });
    });

  addActivity("audit", `Auditoria “${activeAudit.title}” concluída localmente`);
  activeAudit = null;
  event.currentTarget.reset();
  await persist("Auditoria salva localmente. Nenhum dado foi enviado para serviços externos.");
  renderAll();
}

function renderTraining() {
  const grid = byId("training-grid");
  grid.replaceChildren();
  const completions = recordsForStore("trainingCompletions");

  TRAINING_MODULES.forEach((module) => {
    const card = createElement("article", "training-card");
    const completion = completions.find((item) => item.moduleId === module.id);
    card.append(
      createElement("span", "status-label", `${module.duration} · conteúdo textual`),
      createElement("h2", "", module.title),
      createElement("p", "", module.summary),
      createElement("strong", "", module.question),
    );

    if (completion) {
      card.append(
        createElement(
          "div",
          "notice small-notice",
          `Concluído localmente em ${formatDate(completion.createdAt, true)}.`,
        ),
      );
    } else {
      const options = createElement("div", "quiz-options");
      module.options.forEach((optionText, optionIndex) => {
        const button = createElement("button", "quiz-option", optionText);
        button.type = "button";
        button.dataset.trainingModule = module.id;
        button.dataset.trainingOption = String(optionIndex);
        options.append(button);
      });
      card.append(options);
    }
    grid.append(card);
  });

  const history = byId("training-history");
  history.replaceChildren();
  if (!completions.length) {
    history.append(createElement("p", "empty-message", "Nenhum módulo concluído nesta unidade."));
    return;
  }
  sortNewest(completions).forEach((completion) => {
    const module = TRAINING_MODULES.find((item) => item.id === completion.moduleId);
    const item = createElement("article", "timeline-item");
    item.append(
      createElement("p", "", module?.title ?? completion.moduleId),
      createElement("small", "", formatDate(completion.createdAt, true)),
    );
    history.append(item);
  });
}

async function answerTraining(moduleId, optionIndex) {
  const module = TRAINING_MODULES.find((item) => item.id === moduleId);
  if (!module) return;
  if (Number(optionIndex) !== module.answer) {
    announce("Resposta incorreta. Revise o procedimento e tente novamente.");
    return;
  }

  if (
    workspace.trainingCompletions.some(
      (item) => item.storeId === currentStore && item.moduleId === moduleId,
    )
  ) {
    announce("Este módulo já foi concluído localmente.");
    return;
  }

  workspace.trainingCompletions.push({
    id: createId("training"),
    storeId: currentStore,
    moduleId,
    score: 100,
    createdAt: new Date().toISOString(),
  });
  addActivity("training", `Treinamento “${module.title}” concluído localmente`);
  await persist("Conclusão registrada neste dispositivo. Isso não é uma certificação oficial.");
  renderAll();
}

function renderIncidents() {
  const tbody = byId("incident-table-body");
  tbody.replaceChildren();
  const incidents = sortNewest(recordsForStore("incidents"));
  byId("incident-count").textContent = incidents.length;
  if (!incidents.length) {
    appendEmptyRow(tbody, 5, "Nenhuma ocorrência registrada nesta unidade.");
    return;
  }

  incidents.forEach((incident) => {
    const row = document.createElement("tr");
    appendTextCell(row, formatDate(incident.createdAt, true));
    appendTextCell(row, incident.sector);
    const productCell = appendTextCell(row, incident.product);
    productCell.append(createElement("small", "", incident.description));
    appendTextCell(row, incident.type);
    appendTextCell(row, formatCurrency(incident.cost));
    tbody.append(row);
  });
}

async function submitIncident(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.incidents.push({
    id: createId("incident"),
    storeId: currentStore,
    sector: normalizeText(data.get("sector"), 80),
    product: normalizeText(data.get("product"), 120),
    type: normalizeText(data.get("type"), 80),
    cost: toFiniteNumber(data.get("cost")),
    description: normalizeText(data.get("description"), 600),
    createdAt: new Date().toISOString(),
  });
  addActivity("incident", `Ocorrência registrada: ${normalizeText(data.get("product"), 100)}`);
  event.currentTarget.reset();
  await persist("Ocorrência salva localmente. Nenhuma imagem de CFTV foi reservada.");
  renderAll();
}

function renderEpiDeliveries() {
  const tbody = byId("epi-table-body");
  tbody.replaceChildren();
  const deliveries = sortNewest(recordsForStore("epiDeliveries"));
  byId("epi-count").textContent = deliveries.length;
  if (!deliveries.length) {
    appendEmptyRow(tbody, 5, "Nenhuma entrega registrada nesta unidade.");
    return;
  }
  deliveries.forEach((delivery) => {
    const row = document.createElement("tr");
    appendTextCell(row, delivery.employee);
    appendTextCell(row, delivery.item);
    appendTextCell(row, formatDate(delivery.expiry));
    appendTextCell(row, delivery.registration);
    appendTextCell(row, formatDate(delivery.createdAt, true));
    tbody.append(row);
  });
}

async function submitEpi(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.epiDeliveries.push({
    id: createId("epi"),
    storeId: currentStore,
    employee: normalizeText(data.get("employee"), 120),
    item: normalizeText(data.get("item"), 100),
    expiry: String(data.get("expiry")),
    registration: normalizeText(data.get("registration"), 20),
    verificationStatus: "draft-local",
    createdAt: new Date().toISOString(),
  });
  addActivity("epi", `Rascunho de EPI criado para ${normalizeText(data.get("employee"), 100)}`);
  event.currentTarget.reset();
  setDateDefaults();
  await persist("Rascunho de EPI salvo. Nenhuma assinatura digital foi produzida.");
  renderAll();
}

function renderReceivingAudits() {
  const tbody = byId("receiving-table-body");
  tbody.replaceChildren();
  const audits = sortNewest(recordsForStore("receivingAudits"));
  byId("receiving-count").textContent = audits.length;
  if (!audits.length) {
    appendEmptyRow(tbody, 5, "Nenhuma carga avaliada nesta unidade.");
    return;
  }
  audits.forEach((audit) => {
    const row = document.createElement("tr");
    appendTextCell(row, formatDate(audit.createdAt, true));
    appendTextCell(row, audit.supplier);
    appendTextCell(row, audit.invoice);
    appendTextCell(row, `${formatNumber(audit.temperature, { maximumFractionDigits: 1 })} °C`);
    const statusCell = document.createElement("td");
    statusCell.append(statusLabel(audit.status));
    row.append(statusCell);
    tbody.append(row);
  });
}

async function submitReceiving(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.receivingAudits.push({
    id: createId("receiving"),
    storeId: currentStore,
    supplier: normalizeText(data.get("supplier"), 140),
    invoice: normalizeText(data.get("invoice"), 44),
    temperature: toFiniteNumber(data.get("temperature")),
    status: String(data.get("status")),
    notes: normalizeText(data.get("notes"), 600),
    createdAt: new Date().toISOString(),
  });
  addActivity("receiving", `Carga de ${normalizeText(data.get("supplier"), 100)} avaliada localmente`);
  event.currentTarget.reset();
  await persist("Laudo local salvo. Nenhum PDF ou aviso externo foi gerado.");
  renderAll();
}

function renderMaintenance() {
  const tbody = byId("maintenance-table-body");
  tbody.replaceChildren();
  const tickets = sortNewest(recordsForStore("maintenanceTickets"));
  byId("maintenance-count").textContent = tickets.length;
  if (!tickets.length) {
    appendEmptyRow(tbody, 5, "Nenhum chamado registrado nesta unidade.");
    return;
  }
  tickets.forEach((ticket) => {
    const row = document.createElement("tr");
    appendTextCell(row, formatDate(ticket.createdAt, true));
    const equipmentCell = appendTextCell(row, ticket.equipment);
    equipmentCell.append(createElement("small", "", ticket.description));
    const urgencyCell = document.createElement("td");
    urgencyCell.append(statusLabel(ticket.urgency));
    row.append(urgencyCell);
    appendTextCell(row, ticket.owner);
    appendTextCell(row, formatCurrency(ticket.cost));
    tbody.append(row);
  });
}

async function submitMaintenance(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.maintenanceTickets.push({
    id: createId("maintenance"),
    storeId: currentStore,
    equipment: normalizeText(data.get("equipment"), 140),
    urgency: String(data.get("urgency")),
    owner: normalizeText(data.get("owner"), 120),
    cost: toFiniteNumber(data.get("cost")),
    description: normalizeText(data.get("description"), 600),
    status: "open",
    createdAt: new Date().toISOString(),
  });
  addActivity("maintenance", `Chamado local criado: ${normalizeText(data.get("equipment"), 100)}`);
  event.currentTarget.reset();
  await persist("Chamado salvo localmente. Nenhuma equipe externa foi notificada.");
  renderAll();
}

function addBuilderQuestion(value = "") {
  const list = byId("builder-question-list");
  const item = createElement("div", "builder-question");
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 220;
  input.required = true;
  input.placeholder = "Ex.: A área está limpa e sinalizada?";
  input.value = value;
  input.setAttribute("aria-label", `Pergunta ${list.children.length + 1}`);
  const removeButton = createElement("button", "icon-button", "×");
  removeButton.type = "button";
  removeButton.dataset.action = "remove-builder-question";
  removeButton.setAttribute("aria-label", "Remover pergunta");
  item.append(input, removeButton);
  list.append(item);
}

function renderTemplates() {
  const container = byId("template-list");
  container.replaceChildren();
  const templates = sortNewest(recordsForStore("checklistTemplates"));
  byId("template-count").textContent = templates.length;
  if (!templates.length) {
    container.append(createElement("p", "empty-message", "Nenhum modelo personalizado criado."));
    return;
  }
  templates.forEach((template) => {
    const item = createElement("article", "template-item");
    const text = createElement("div");
    text.append(
      createElement("p", "", template.name),
      createElement("small", "", `${template.sector} · ${template.questions.length} perguntas`),
    );
    const runButton = createElement("button", "button secondary", "Executar");
    runButton.type = "button";
    runButton.dataset.runTemplate = template.id;
    item.append(text, runButton);
    container.append(item);
  });
}

async function submitBuilder(event) {
  event.preventDefault();
  const questionInputs = [
    ...byId("builder-question-list").querySelectorAll('input[type="text"]'),
  ];
  const questions = questionInputs
    .map((input) => normalizeText(input.value, 220))
    .filter(Boolean);
  if (!questions.length) {
    announce("Adicione ao menos uma pergunta ao checklist.");
    return;
  }
  const data = new FormData(event.currentTarget);
  workspace.checklistTemplates.push({
    id: createId("template"),
    storeId: currentStore,
    name: normalizeText(data.get("name"), 120),
    title: normalizeText(data.get("name"), 120),
    sector: normalizeText(data.get("sector"), 80),
    questions,
    createdAt: new Date().toISOString(),
  });
  addActivity("template", `Modelo de checklist criado: ${normalizeText(data.get("name"), 100)}`);
  event.currentTarget.reset();
  byId("builder-question-list").replaceChildren();
  addBuilderQuestion();
  await persist("Modelo completo salvo localmente.");
  renderAll();
}

function renderActions() {
  const container = byId("action-list");
  container.replaceChildren();
  const actions = sortNewest(recordsForStore("actions"));
  const openActions = actions.filter((action) => action.status === "open");
  byId("action-count").textContent = openActions.length;
  byId("side-action-count").textContent = openActions.length;
  if (!actions.length) {
    container.append(createElement("p", "empty-message", "Nenhum plano registrado nesta unidade."));
    return;
  }

  actions.forEach((action) => {
    const item = createElement(
      "article",
      `action-item ${action.status === "complete" ? "is-complete" : ""}`.trim(),
    );
    const text = createElement("div");
    text.append(
      createElement("p", "", action.what),
      createElement("small", "", action.why),
    );
    const meta = createElement("div", "action-meta");
    meta.append(
      createElement("span", "", `Responsável: ${action.who}`),
      createElement("span", "", `Prazo: ${formatDate(action.dueAt, true)}`),
      statusLabel(action.status === "complete" ? "approved" : "conditional"),
    );
    text.append(meta);
    item.append(text);
    if (action.status === "open") {
      const button = createElement("button", "button secondary", "Concluir localmente");
      button.type = "button";
      button.dataset.completeAction = action.id;
      item.append(button);
    }
    container.append(item);
  });
}

async function submitAction(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.actions.push({
    id: createId("action"),
    storeId: currentStore,
    what: normalizeText(data.get("what"), 180),
    why: normalizeText(data.get("why"), 500),
    who: normalizeText(data.get("who"), 120),
    dueAt: new Date(String(data.get("dueAt"))).toISOString(),
    status: "open",
    createdAt: new Date().toISOString(),
  });
  addActivity("action", `Plano 5W2H criado: ${normalizeText(data.get("what"), 100)}`);
  event.currentTarget.reset();
  setDateDefaults();
  await persist("Plano 5W2H salvo localmente.");
  renderAll();
}

async function completeAction(actionId) {
  const action = workspace.actions.find((item) => item.id === actionId);
  if (!action || action.storeId !== currentStore || action.status !== "open") return;
  action.status = "complete";
  action.completedAt = new Date().toISOString();
  addActivity("action", `Plano concluído localmente: ${action.what}`);
  await persist("Plano concluído localmente. Os contadores foram atualizados.");
  renderAll();
}

function renderProducts() {
  const tbody = byId("product-table-body");
  tbody.replaceChildren();
  const products = sortNewest(recordsForStore("products"));
  byId("product-count").textContent = products.length;
  if (!products.length) {
    appendEmptyRow(tbody, 8, "Nenhum produto crítico registrado nesta unidade.");
    return;
  }
  products.forEach((product) => {
    const row = document.createElement("tr");
    const productCell = appendTextCell(row, product.name);
    productCell.append(createElement("small", "", `EAN ${product.barcode}`));
    appendTextCell(row, `${formatNumber(product.quantity)} un.`);
    const remainingDays = daysUntil(product.expiry);
    appendTextCell(
      row,
      remainingDays === null
        ? formatDate(product.expiry)
        : `${remainingDays} dia${remainingDays === 1 ? "" : "s"}`,
    );
    appendTextCell(row, formatCurrency(product.cost));
    appendTextCell(row, formatCurrency(product.retail));
    appendTextCell(row, formatCurrency(product.suggested));
    const margin = calculateMargin(product.cost, product.suggested);
    appendTextCell(row, margin === null ? "—" : `${formatNumber(margin, { maximumFractionDigits: 1 })}%`);
    const integrationCell = document.createElement("td");
    if (product.integrationStatus === "not-sent") {
      const button = createElement("button", "button ghost", "Preparar integração");
      button.type = "button";
      button.dataset.prepareProduct = product.id;
      integrationCell.append(button);
    } else {
      integrationCell.append(statusLabel(product.integrationStatus));
    }
    row.append(integrationCell);
    tbody.append(row);
  });
}

function updateMarginPreview() {
  const cost = byId("product-cost").value;
  const suggested = byId("product-suggested").value;
  const margin = calculateMargin(cost, suggested);
  byId("product-margin-preview").textContent =
    margin === null
      ? "Informe custo e preço sugerido válidos para calcular a margem."
      : `Margem estimada: ${formatNumber(margin, { maximumFractionDigits: 1 })}%. A aprovação real deve acontecer no backend autorizado.`;
}

async function submitProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const barcode = String(data.get("barcode"));
  const barcodeInput = byId("product-barcode");
  barcodeInput.setCustomValidity(
    validateEan13(barcode) ? "" : "Informe um EAN-13 com dígito verificador válido.",
  );
  if (!form.reportValidity()) return;

  const cost = toFiniteNumber(data.get("cost"));
  const retail = toFiniteNumber(data.get("retail"));
  const suggested = toFiniteNumber(data.get("suggested"));
  if (calculateMargin(cost, suggested) === null) {
    announce("Custo e preço sugerido precisam ser valores positivos.");
    return;
  }

  workspace.products.push({
    id: createId("product"),
    storeId: currentStore,
    barcode,
    name: normalizeText(data.get("name"), 160),
    quantity: Math.trunc(toFiniteNumber(data.get("quantity"))),
    expiry: String(data.get("expiry")),
    cost,
    retail,
    suggested,
    integrationStatus: "not-sent",
    createdAt: new Date().toISOString(),
  });
  addActivity("product", `Produto crítico adicionado: ${normalizeText(data.get("name"), 100)}`);
  form.reset();
  barcodeInput.setCustomValidity("");
  setDateDefaults();
  updateMarginPreview();
  await persist("Produto adicionado à análise local. Nenhum preço foi alterado no VR.");
  renderAll();
}

async function prepareProduct(productId) {
  const product = workspace.products.find((item) => item.id === productId);
  if (!product || product.storeId !== currentStore) return;
  product.integrationStatus = "prepared";
  product.integrationPreparedAt = new Date().toISOString();
  addActivity("product", `Integração preparada, mas não enviada: ${product.name}`);
  await persist("Ação marcada como aguardando backend. Nenhum PDV foi atualizado.");
  renderAll();
}

function renderNotifications() {
  const container = byId("notification-list");
  container.replaceChildren();
  const drafts = sortNewest(recordsForStore("notificationDrafts"));
  byId("notification-count").textContent = drafts.length;
  if (!drafts.length) {
    container.append(createElement("p", "empty-message", "Nenhum rascunho criado nesta unidade."));
    return;
  }
  drafts.forEach((draft) => {
    const item = createElement("article", "message-item");
    const text = createElement("div");
    text.append(
      createElement("p", "", draft.message),
      createElement("small", "", `${draft.audience} · ${formatDate(draft.createdAt, true)}`),
    );
    item.append(text, statusLabel("not-sent"));
    container.append(item);
  });
}

async function submitNotification(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.notificationDrafts.push({
    id: createId("notification"),
    storeId: currentStore,
    audience: normalizeText(data.get("audience"), 120),
    message: normalizeText(data.get("message"), 1000),
    status: "draft-local",
    createdAt: new Date().toISOString(),
  });
  addActivity("notification", "Rascunho de aviso operacional criado");
  event.currentTarget.reset();
  await persist("Rascunho salvo localmente. Nenhuma mensagem foi enviada.");
  renderAll();
}

function renderAnalytics() {
  const metrics = deriveStoreMetrics(workspace, currentStore);
  const audits = recordsForStore("audits");
  const products = recordsForStore("products");
  byId("analytics-audits").textContent = audits.length;
  byId("analytics-conformity").textContent =
    metrics.conform + metrics.nonconform === 0 ? "—" : `${metrics.score}%`;
  byId("analytics-actions").textContent = metrics.openActions;
  byId("analytics-products").textContent = products.length;

  const tbody = byId("analytics-table-body");
  tbody.replaceChildren();
  [
    ["Auditorias concluídas", audits.length, audits.length ? "Com registros" : "Sem registros"],
    ["Planos em aberto", metrics.openActions, metrics.openActions ? "Requer atenção" : "Sem pendências"],
    ["Produtos críticos", products.length, products.length ? "Em tratamento" : "Sem registros"],
    ["Ocorrências", recordsForStore("incidents").length, "Histórico local"],
    ["Chamados de manutenção", recordsForStore("maintenanceTickets").length, "Histórico local"],
  ].forEach(([category, total, situation]) => {
    const row = document.createElement("tr");
    appendTextCell(row, category);
    appendTextCell(row, total);
    appendTextCell(row, situation);
    tbody.append(row);
  });
}

function exportCsv() {
  const metrics = deriveStoreMetrics(workspace, currentStore);
  const rows = [
    ["Unidade", "Índice", "Auditorias", "Planos abertos", "Produtos críticos", "Ocorrências"],
    [
      STORES[currentStore].name,
      metrics.score,
      recordsForStore("audits").length,
      metrics.openActions,
      recordsForStore("products").length,
      recordsForStore("incidents").length,
    ],
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(";")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `resumo-operacional-loja-${currentStore}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  announce("CSV gerado a partir dos dados locais da unidade ativa.");
}

function renderRanking() {
  const container = byId("ranking-grid");
  container.replaceChildren();
  const ranking = Object.values(STORES)
    .map((store) => ({ store, metrics: deriveStoreMetrics(workspace, store.id) }))
    .sort((first, second) => second.metrics.score - first.metrics.score);

  ranking.forEach((entry, index) => {
    const card = createElement("article", `ranking-card ${index === 0 ? "is-leading" : ""}`.trim());
    card.append(
      createElement("span", "status-label", index === 0 ? "Maior índice atual" : "Unidade comparada"),
      createElement("h2", "", entry.store.name),
    );
    const score = createElement("div", "ranking-score");
    score.append(
      createElement("strong", "", entry.metrics.score),
      createElement("span", "", "%"),
    );
    card.append(
      score,
      createElement(
        "p",
        "",
        `${entry.metrics.auditsToday} auditoria(s) hoje · ${entry.metrics.openActions} plano(s) aberto(s)`,
      ),
    );
    container.append(card);
  });
}

function renderAll() {
  renderDashboard();
  renderAuditRunner();
  renderAuditHistory();
  renderTraining();
  renderIncidents();
  renderEpiDeliveries();
  renderReceivingAudits();
  renderAnalytics();
  renderMaintenance();
  renderTemplates();
  renderActions();
  renderProducts();
  renderNotifications();
  renderRanking();
}

function setDateDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const localDateTime = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  ["epi-expiry", "product-expiry"].forEach((id) => {
    const input = byId(id);
    input.min = today;
    if (!input.value) input.value = today;
  });
  const actionWhen = byId("action-when");
  actionWhen.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  if (!actionWhen.value) actionWhen.value = localDateTime;
}

function updateConnectionState() {
  const online = navigator.onLine;
  const dot = byId("connection-dot");
  dot.classList.toggle("offline", !online);
  byId("connection-title").textContent = online
    ? "Dados locais disponíveis"
    : "Sem conexão · modo local";
  byId("connection-detail").textContent = online
    ? "Nenhuma integração externa ativa"
    : "Rascunhos continuam neste dispositivo";
}

function requestConfirmation(title, message, callback) {
  byId("confirm-title").textContent = title;
  byId("confirm-message").textContent = message;
  pendingConfirmation = callback;
  byId("confirm-dialog").showModal();
}

async function importBackup(file) {
  try {
    workspace = await parseWorkspaceBackup(file);
    workspace = await saveWorkspace(workspace);
    persistenceAvailable = true;
    activeAudit = null;
    renderAll();
    navigate("dashboard");
    announce("Backup compatível importado com sucesso.");
  } catch (error) {
    console.error(error);
    announce(error.message || "Não foi possível importar o backup.");
  } finally {
    byId("backup-file").value = "";
  }
}

function bindForms() {
  byId("audit-form").addEventListener("submit", submitAudit);
  byId("incident-form").addEventListener("submit", submitIncident);
  byId("epi-form").addEventListener("submit", submitEpi);
  byId("receiving-form").addEventListener("submit", submitReceiving);
  byId("maintenance-form").addEventListener("submit", submitMaintenance);
  byId("builder-form").addEventListener("submit", submitBuilder);
  byId("action-form").addEventListener("submit", submitAction);
  byId("product-form").addEventListener("submit", submitProduct);
  byId("notification-form").addEventListener("submit", submitNotification);
}

function bindGlobalEvents() {
  document.addEventListener("click", async (event) => {
    const viewButton = findDataTarget(event.target, "data-view");
    if (viewButton) {
      navigate(viewButton.dataset.view);
      return;
    }

    const auditButton = findDataTarget(event.target, "data-start-audit");
    if (auditButton) {
      startAudit(auditButton.dataset.startAudit);
      return;
    }

    const trainingButton = findDataTarget(event.target, "data-training-module");
    if (trainingButton) {
      await answerTraining(
        trainingButton.dataset.trainingModule,
        trainingButton.dataset.trainingOption,
      );
      return;
    }

    const templateButton = findDataTarget(event.target, "data-run-template");
    if (templateButton) {
      const template = workspace.checklistTemplates.find(
        (item) => item.id === templateButton.dataset.runTemplate,
      );
      if (template) startAudit(template.id, template);
      return;
    }

    const completeButton = findDataTarget(event.target, "data-complete-action");
    if (completeButton) {
      await completeAction(completeButton.dataset.completeAction);
      return;
    }

    const prepareButton = findDataTarget(event.target, "data-prepare-product");
    if (prepareButton) {
      await prepareProduct(prepareButton.dataset.prepareProduct);
      return;
    }

    const actionButton = findDataTarget(event.target, "data-action");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "cancel-audit") {
      activeAudit = null;
      renderAuditRunner();
      announce("Auditoria cancelada sem salvar.");
    } else if (action === "add-builder-question") {
      addBuilderQuestion();
    } else if (action === "remove-builder-question") {
      const list = byId("builder-question-list");
      if (list.children.length <= 1) {
        announce("O checklist precisa manter ao menos uma pergunta.");
      } else {
        let question = actionButton.parentElement;
        while (question && !question.classList.contains("builder-question")) {
          question = question.parentElement;
        }
        question?.remove();
      }
    } else if (action === "export-backup") {
      downloadWorkspaceBackup(workspace);
      announce("Backup local exportado.");
    } else if (action === "choose-import") {
      byId("backup-file").click();
    } else if (action === "request-reset") {
      requestConfirmation(
        "Reiniciar demonstração",
        "Todos os registros locais deste dispositivo serão substituídos pelos dados iniciais de demonstração.",
        async () => {
          workspace = await resetWorkspace();
          activeAudit = null;
          renderAll();
          navigate("dashboard");
          announce("Demonstração reiniciada.");
        },
      );
    } else if (action === "export-csv") {
      exportCsv();
    }
  });

  document.querySelectorAll("[data-store-select]").forEach((select) => {
    select.addEventListener("change", () => changeStore(select.value));
  });
  byId("module-select-mobile").addEventListener("change", (event) => {
    navigate(event.target.value);
  });
  byId("backup-file").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importBackup(file);
  });
  ["product-cost", "product-suggested"].forEach((id) => {
    byId(id).addEventListener("input", updateMarginPreview);
  });
  byId("product-barcode").addEventListener("input", (event) => {
    event.target.setCustomValidity("");
  });

  byId("confirm-dialog").addEventListener("close", async (event) => {
    const callback = pendingConfirmation;
    pendingConfirmation = null;
    if (event.target.returnValue === "confirm" && callback) {
      try {
        await callback();
      } catch (error) {
        console.error(error);
        announce("Não foi possível concluir a ação.");
      }
    }
  });

  window.addEventListener("online", updateConnectionState);
  window.addEventListener("offline", updateConnectionState);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(location.protocol)) return;
  try {
    await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  } catch (error) {
    console.warn("Service worker indisponível:", error);
  }
}

async function initialize() {
  try {
    workspace = await loadWorkspace();
  } catch (error) {
    persistenceAvailable = false;
    workspace = createInitialWorkspace();
    console.error(error);
    byId("save-status").textContent = "Somente nesta sessão";
  }

  bindForms();
  bindGlobalEvents();
  addBuilderQuestion();
  setDateDefaults();
  updateMarginPreview();
  updateConnectionState();
  renderAll();
  navigate("dashboard", { focus: false });
  registerServiceWorker();

  console.info(`Super Checklist Paranaíba v${APP_VERSION} iniciado em modo de demonstração local.`);
}

initialize();
