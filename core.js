export const APP_VERSION = "21.0.1";
export const DATA_SCHEMA_VERSION = 1;

export const STORES = Object.freeze({
  "1": { id: "1", name: "Loja 1 — Centro", target: 92 },
  "2": { id: "2", name: "Loja 2 — Bairro", target: 90 },
});

export const MODULES = Object.freeze([
  { id: "dashboard", label: "Visão geral", short: "Início" },
  { id: "rotinas", label: "Auditorias e setores", short: "Rotinas" },
  { id: "treinamento", label: "Treinamentos POP", short: "POP" },
  { id: "furtos", label: "Furtos e avarias", short: "Ocorrências" },
  { id: "epi", label: "Segurança e EPIs", short: "EPIs" },
  { id: "fornecedores", label: "Doca e fornecedores", short: "Doca" },
  { id: "analytics", label: "Indicadores e exportações", short: "Indicadores" },
  { id: "manutencao", label: "Manutenção", short: "Manutenção" },
  { id: "builder", label: "Criador de checklists", short: "Criador" },
  { id: "5w2h", label: "Planos 5W2H", short: "5W2H" },
  { id: "perdas", label: "Prevenção de perdas", short: "Perdas" },
  { id: "whatsapp", label: "Central de notificações", short: "Avisos" },
  { id: "ranking", label: "Comparativo entre lojas", short: "Ranking" },
]);

export const SECTOR_TEMPLATES = Object.freeze({
  acougue: {
    title: "Açougue e câmaras frias",
    questions: [
      "A temperatura da câmara de resfriados está entre 0°C e 4°C?",
      "Facas, tábuas e serras foram higienizadas e registradas?",
      "Produtos estão identificados com lote, validade e responsável?",
    ],
  },
  flv: {
    title: "Recebimento de FLV e doca",
    questions: [
      "A carga chegou com documentação e lacre conferidos?",
      "A amostragem está livre de avarias acima do limite interno?",
      "Temperatura, lote e validade foram registrados?",
    ],
  },
  gondola: {
    title: "Ruptura, gôndola e precificação",
    questions: [
      "Os itens de alto giro estão disponíveis na área de venda?",
      "Preço de gôndola e cadastro interno estão consistentes?",
      "Produtos críticos estão sinalizados para ação preventiva?",
    ],
  },
  fechamento: {
    title: "Fechamento e proteção noturna",
    questions: [
      "Equipamentos críticos foram conferidos antes do fechamento?",
      "Rotas de fuga e equipamentos de emergência estão livres?",
      "A proteção térmica e os registros de fechamento foram concluídos?",
    ],
  },
});

export const TRAINING_MODULES = Object.freeze([
  {
    id: "pop-acougue",
    title: "Higiene no açougue e NR-36",
    duration: "8 min",
    summary: "Higienização, proteção individual e prevenção de contaminação cruzada.",
    question: "Qual item é obrigatório durante o uso de serra-fita?",
    options: ["Luva de malha de aço na mão de apoio", "Luva de lã", "Somente avental"],
    answer: 0,
  },
  {
    id: "pop-doca",
    title: "Recebimento refrigerado",
    duration: "6 min",
    summary: "Conferência documental, temperatura, amostragem e decisão de aceite.",
    question: "O que deve acontecer quando a temperatura está fora do limite?",
    options: ["Registrar e decidir conforme o procedimento", "Ocultar a medição", "Aceitar sempre"],
    answer: 0,
  },
  {
    id: "pop-perdas",
    title: "Prevenção de perdas e rebaixe",
    duration: "7 min",
    summary: "Identificação antecipada de validade crítica e aprovação responsável de preço.",
    question: "Quando um rebaixe pode ser considerado concluído?",
    options: ["Após confirmação do sistema responsável", "Ao clicar no botão", "Ao editar a planilha"],
    answer: 0,
  },
]);

export function createId(prefix = "item") {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

export function normalizeText(value, maxLength = 240) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateMargin(cost, price) {
  const safeCost = toFiniteNumber(cost);
  const safePrice = toFiniteNumber(price);
  if (safeCost < 0 || safePrice <= 0) return null;
  return ((safePrice - safeCost) / safePrice) * 100;
}

export function classifyHealth(score) {
  const safeScore = Math.max(0, Math.min(100, toFiniteNumber(score)));
  if (safeScore >= 90) return { label: "Excelente", tone: "success" };
  if (safeScore >= 75) return { label: "Atenção", tone: "warning" };
  return { label: "Crítico", tone: "danger" };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toFiniteNumber(value));
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("pt-BR", options).format(toFiniteNumber(value));
}

export function formatDate(value, includeTime = false) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(includeTime ? { timeStyle: "short" } : {}),
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function daysUntil(value, from = new Date()) {
  const target = new Date(`${value}T12:00:00`);
  const base = new Date(from);
  if (Number.isNaN(target.getTime()) || Number.isNaN(base.getTime())) return null;
  const dayMs = 86_400_000;
  return Math.ceil((target.getTime() - base.getTime()) / dayMs);
}

export function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function validateEan13(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 13) return false;
  const sum = digits
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[12]);
}

export function createInitialWorkspace(now = new Date()) {
  const iso = now.toISOString();
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    mode: "demo-local",
    updatedAt: iso,
    audits: [],
    incidents: [],
    epiDeliveries: [],
    receivingAudits: [],
    maintenanceTickets: [],
    checklistTemplates: [],
    actions: [
      {
        id: createId("action"),
        storeId: "1",
        what: "Revisar temperatura da câmara de resfriados",
        why: "Medição de demonstração acima do limite interno",
        who: "Encarregado do açougue",
        dueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        status: "open",
        createdAt: iso,
      },
    ],
    products: [
      {
        id: createId("product"),
        storeId: "1",
        name: "Iogurte grego 400 g",
        barcode: "7891000100103",
        quantity: 42,
        expiry: new Date(now.getTime() + 3 * 86_400_000).toISOString().slice(0, 10),
        cost: 3.2,
        retail: 8.9,
        suggested: 4.99,
        integrationStatus: "not-sent",
        createdAt: iso,
      },
    ],
    trainingCompletions: [],
    notificationDrafts: [],
    activity: [
      {
        id: createId("activity"),
        storeId: "1",
        type: "workspace",
        description: "Ambiente de demonstração iniciado com dados ilustrativos",
        createdAt: iso,
      },
    ],
  };
}

export function deriveStoreMetrics(workspace, storeId) {
  const audits = workspace.audits.filter((item) => item.storeId === storeId);
  const answers = audits.flatMap((item) => item.answers ?? []);
  const conform = answers.filter((item) => item.choice === "conform").length;
  const nonconform = answers.filter((item) => item.choice === "nonconform").length;
  const denominator = conform + nonconform;
  const score = denominator > 0 ? Math.round((conform / denominator) * 100) : storeId === "1" ? 94 : 88;
  const openActions = workspace.actions.filter(
    (item) => item.storeId === storeId && item.status === "open",
  ).length;
  const products = workspace.products.filter((item) => item.storeId === storeId);
  const protectedValue = products.reduce(
    (total, item) => total + Math.max(0, toFiniteNumber(item.retail) - toFiniteNumber(item.suggested)) * toFiniteNumber(item.quantity),
    0,
  );

  return {
    score,
    conform,
    nonconform,
    auditsToday: audits.filter((item) => item.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    openActions,
    protectedValue,
  };
}
