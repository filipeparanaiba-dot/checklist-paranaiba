import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import type {
  DraftAnswer,
  ExecutionSubmission,
  OperatorAssignment,
  OperatorQuestion,
  SyncOperation,
} from "@checklist/contracts";
import { ApiClient } from "./api.js";
import { loadState, saveState, type LocalState } from "./storage.js";
import "./styles.css";

type Screen = "login" | "tasks" | "preflight" | "question" | "review" | "receipt";

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("APP_ROOT_NOT_FOUND");
const root: HTMLDivElement = rootElement;

const api = new ApiClient();
let state: LocalState = await loadState();
let screen: Screen = "login";
let active: OperatorAssignment | null = null;
let questionIndex = 0;
let online = (await Network.getStatus()).connected;
let errorMessage = "";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function frame(content: string) {
  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand"><span class="mark" aria-hidden="true">✓</span><span>Checklist<br>Paranaíba</span></div>
        <span class="network ${online ? "" : "offline"}">${online ? "Conectado" : "Modo offline"}</span>
      </header>
      <main id="main">${content}</main>
    </div>`;
}

function draftsFor(assignmentId: string) {
  return state.drafts[assignmentId] ?? [];
}

function answerFor(questionId: string) {
  return active ? draftsFor(active.id).find((answer) => answer.questionId === questionId) : undefined;
}

function answerLabel(question: OperatorQuestion, value: unknown) {
  if (question.kind === "boolean") return value === true ? "Sim" : value === false ? "Não" : "Não respondido";
  return value === "" || value === undefined ? "Não respondido" : String(value);
}

function isAnswered(question: OperatorQuestion) {
  const answer = answerFor(question.id);
  return Boolean(answer && answer.value !== "" && answer.value !== null && answer.value !== undefined);
}

async function persistAnswer(question: OperatorQuestion, value: DraftAnswer["value"]) {
  if (!active) return;
  const answers = draftsFor(active.id).filter((answer) => answer.questionId !== question.id);
  const next: DraftAnswer = { questionId: question.id, value, observedAt: new Date().toISOString() };
  state.drafts[active.id] = [...answers, next];
  await saveState(state);
}

async function syncOutbox() {
  if (!online || state.outbox.length === 0) return;
  const remaining: SyncOperation[] = [];
  for (const operation of state.outbox) {
    try {
      const receipt = await api.submit(operation.payload, operation.idempotencyKey);
      if (!state.receipts.some((item) => item.executionId === receipt.executionId)) {
        state.receipts.unshift(receipt);
      }
      state.assignments = state.assignments.filter((item) => item.id !== operation.payload.assignmentId);
      delete state.drafts[operation.payload.assignmentId];
      delete state.startedAt[operation.payload.assignmentId];
    } catch {
      remaining.push(operation);
    }
  }
  state.outbox = remaining;
  await saveState(state);
}

function renderLogin() {
  frame(`
    <section class="card hero">
      <p class="eyebrow">Execução operacional</p>
      <h1>Entre para ver suas tarefas</h1>
      <p class="muted">Este aplicativo mostra somente as perguntas necessárias. Resultados, notas e regras de avaliação ficam restritos à gestão.</p>
      <form id="login-form">
        <div class="field">
          <label for="email">E-mail corporativo</label>
          <input id="email" name="email" type="email" autocomplete="username" required
            value="${escapeHtml(import.meta.env.VITE_OPERATOR_EMAIL || "operador@paranaiba.local")}" />
        </div>
        <p class="error" role="alert">${escapeHtml(errorMessage)}</p>
        <button class="button" type="submit">Entrar</button>
        ${!online && state.assignments.length ? `<button id="offline-entry" class="button secondary" type="button">Continuar com tarefas salvas</button>` : ""}
      </form>
    </section>`);
  document.querySelector("#login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    errorMessage = "";
    try {
      await api.developmentLogin(String(form.get("email") ?? ""));
      state.lastAuthenticatedAt = new Date().toISOString();
      if (online) {
        await syncOutbox();
        state.assignments = await api.assignments();
        await saveState(state);
      }
      screen = "tasks";
      render();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Não foi possível entrar.";
      render();
    }
  });
  document.querySelector("#offline-entry")?.addEventListener("click", () => {
    screen = "tasks";
    errorMessage = "";
    render();
  });
}

function renderTasks() {
  const queued = state.outbox.length;
  frame(`
    <section class="card">
      <p class="eyebrow">Minhas tarefas</p>
      <h1>Checklists disponíveis</h1>
      ${queued ? `<p class="notice">${queued} envio${queued > 1 ? "s" : ""} aguardando conexão. Nada será perdido.</p>` : ""}
      <div class="stack">
        ${state.assignments.length ? state.assignments.map((assignment) => `
          <button class="task" data-task="${escapeHtml(assignment.id)}">
            <strong>${escapeHtml(assignment.templateName)}</strong>
            <span class="meta">
              <span>${escapeHtml(assignment.storeName)}</span>
              <span>${escapeHtml(assignment.sector)}</span>
              <span>cerca de ${assignment.estimatedMinutes} min</span>
            </span>
          </button>`).join("") : `
          <div class="empty"><h2>Nenhuma tarefa pendente</h2><p class="muted">Quando uma tarefa for atribuída, ela aparecerá aqui.</p></div>`}
      </div>
      <div class="actions">
        <button id="refresh" class="button secondary" ${online ? "" : "disabled"}>Atualizar tarefas</button>
        <button id="sync" class="button ghost" ${queued && online ? "" : "disabled"}>Enviar pendências</button>
      </div>
      <p class="error" role="alert">${escapeHtml(errorMessage)}</p>
    </section>`);
  document.querySelectorAll<HTMLElement>("[data-task]").forEach((button) => {
    button.addEventListener("click", () => {
      active = state.assignments.find((item) => item.id === button.dataset.task) ?? null;
      screen = "preflight";
      render();
    });
  });
  document.querySelector("#refresh")?.addEventListener("click", async () => {
    try {
      await syncOutbox();
      state.assignments = await api.assignments();
      await saveState(state);
      errorMessage = "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Falha ao atualizar.";
    }
    render();
  });
  document.querySelector("#sync")?.addEventListener("click", async () => {
    await syncOutbox();
    render();
  });
}

function renderPreflight() {
  if (!active) return goTasks();
  frame(`
    <section class="card">
      <p class="eyebrow">Antes de começar</p>
      <h1>${escapeHtml(active.templateName)}</h1>
      <div class="meta"><span>${escapeHtml(active.storeName)}</span><span>${escapeHtml(active.sector)}</span></div>
      <p>Você responderá ${active.questions.length} itens. Cada resposta é salva automaticamente e o checklist pode continuar mesmo sem internet.</p>
      <p class="notice">Responda apenas o que foi observado. O aplicativo não mostra notas, acertos ou resultados.</p>
      <div class="actions">
        <button id="back" class="button ghost">Voltar</button>
        <button id="start" class="button">Começar</button>
      </div>
    </section>`);
  document.querySelector("#back")?.addEventListener("click", goTasks);
  document.querySelector("#start")?.addEventListener("click", async () => {
    if (!active) return;
    state.startedAt[active.id] ||= new Date().toISOString();
    await saveState(state);
    questionIndex = 0;
    screen = "question";
    render();
  });
}

function questionControl(question: OperatorQuestion) {
  const current = answerFor(question.id)?.value;
  if (question.kind === "boolean") {
    return `<fieldset class="choice-list"><legend>Selecione uma opção</legend>
      ${[["true", "Sim"], ["false", "Não"]].map(([value, label]) => `
        <label class="choice"><input type="radio" name="answer" value="${value}" ${current === (value === "true") ? "checked" : ""}> ${label}</label>`).join("")}
      </fieldset>`;
  }
  if (question.kind === "choice") {
    return `<fieldset class="choice-list"><legend>Selecione uma opção</legend>
      ${(question.options ?? []).map((option) => `
        <label class="choice"><input type="radio" name="answer" value="${escapeHtml(option)}" ${current === option ? "checked" : ""}> ${escapeHtml(option)}</label>`).join("")}
      </fieldset>`;
  }
  const type = question.kind === "number" ? "number" : "text";
  const step = question.kind === "number" ? 'step="any" inputmode="decimal"' : "";
  return `<div class="field"><label for="answer">Resposta${question.unit ? ` (${escapeHtml(question.unit)})` : ""}</label>
    <input id="answer" name="answer" type="${type}" ${step} value="${escapeHtml(current ?? "")}" ${question.required ? "required" : ""}></div>`;
}

function renderQuestion() {
  if (!active) return goTasks();
  const question = active.questions[questionIndex];
  if (!question) {
    screen = "review";
    return render();
  }
  const progress = Math.round(((questionIndex + 1) / active.questions.length) * 100);
  frame(`
    <section class="card">
      <p class="eyebrow">Item ${questionIndex + 1} de ${active.questions.length}</p>
      <div class="progress" aria-label="${progress}% concluído"><span style="width:${progress}%"></span></div>
      <h1 class="question">${escapeHtml(question.prompt)}</h1>
      ${question.help ? `<p class="muted">${escapeHtml(question.help)}</p>` : ""}
      <form id="question-form">
        ${questionControl(question)}
        <p class="error" role="alert">${escapeHtml(errorMessage)}</p>
        <div class="actions">
          <button id="previous" class="button ghost" type="button">${questionIndex === 0 ? "Sair" : "Anterior"}</button>
          <button class="button" type="submit">${questionIndex === active.questions.length - 1 ? "Revisar" : "Próximo"}</button>
        </div>
      </form>
    </section>`);
  document.querySelector("#previous")?.addEventListener("click", () => {
    errorMessage = "";
    if (questionIndex === 0) {
      screen = "tasks";
      active = null;
    } else {
      questionIndex -= 1;
    }
    render();
  });
  document.querySelector("#question-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const rawValue = form.get("answer");
    let value: DraftAnswer["value"] = typeof rawValue === "string" ? rawValue : null;
    if (question.kind === "boolean") value = value === "true";
    if (question.kind === "number") value = value === "" ? "" : Number(value);
    if (value === null || value === "") {
      errorMessage = "Informe uma resposta antes de continuar.";
      return render();
    }
    await persistAnswer(question, value);
    errorMessage = "";
    if (questionIndex === active!.questions.length - 1) screen = "review";
    else questionIndex += 1;
    render();
  });
}

function renderReview() {
  if (!active) return goTasks();
  const missing = active.questions.filter((question) => question.required && !isAnswered(question));
  frame(`
    <section class="card">
      <p class="eyebrow">Revisão</p>
      <h1>Confira suas respostas</h1>
      <p class="muted">Você pode voltar e corrigir qualquer informação antes de enviar.</p>
      <div class="review">
        ${active.questions.map((question, index) => `
          <button class="task review-item" data-review="${index}">
            <strong>${escapeHtml(question.prompt)}</strong>
            <span>${escapeHtml(answerLabel(question, answerFor(question.id)?.value))}</span>
          </button>`).join("")}
      </div>
      <p class="error" role="alert">${missing.length ? `${missing.length} resposta(s) obrigatória(s) pendente(s).` : ""}</p>
      <div class="actions">
        <button id="back-question" class="button ghost">Voltar</button>
        <button id="finish" class="button" ${missing.length ? "disabled" : ""}>Concluir e enviar</button>
      </div>
    </section>`);
  document.querySelectorAll<HTMLElement>("[data-review]").forEach((button) => {
    button.addEventListener("click", () => {
      questionIndex = Number(button.dataset.review);
      screen = "question";
      render();
    });
  });
  document.querySelector("#back-question")?.addEventListener("click", () => {
    questionIndex = Math.max(0, active!.questions.length - 1);
    screen = "question";
    render();
  });
  document.querySelector("#finish")?.addEventListener("click", finish);
}

async function finish() {
  if (!active) return;
  const executionId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const payload: ExecutionSubmission = {
    executionId,
    assignmentId: active.id,
    templateVersionId: active.templateVersionId,
    deviceId: state.deviceId,
    startedAt: state.startedAt[active.id] ?? new Date().toISOString(),
    completedAt: new Date().toISOString(),
    answers: draftsFor(active.id),
  };
  state.outbox.push({
    operationId,
    idempotencyKey: operationId,
    kind: "submit_execution",
    createdAt: new Date().toISOString(),
    attempts: 0,
    state: "pending",
    payload,
  });
  await saveState(state);
  if (online) await syncOutbox();
  screen = "receipt";
  render();
}

function renderReceipt() {
  const receipt = state.receipts[0];
  const pending = state.outbox.length > 0;
  frame(`
    <section class="card receipt">
      <div class="receipt-icon" aria-hidden="true">${pending ? "↥" : "✓"}</div>
      <p class="eyebrow">${pending ? "Salvo no aparelho" : "Envio confirmado"}</p>
      <h1>${pending ? "Será enviado quando houver conexão" : "Checklist concluído"}</h1>
      <p class="muted">${pending ? "Você pode fechar o aplicativo com segurança." : `Protocolo ${escapeHtml(receipt?.protocol ?? "")}`}</p>
      <p>Os resultados ficam disponíveis somente para os responsáveis pela gestão.</p>
      <button id="done" class="button">Voltar às tarefas</button>
    </section>`);
  document.querySelector("#done")?.addEventListener("click", goTasks);
}

function goTasks() {
  active = null;
  screen = "tasks";
  render();
}

function render() {
  if (screen === "login") renderLogin();
  if (screen === "tasks") renderTasks();
  if (screen === "preflight") renderPreflight();
  if (screen === "question") renderQuestion();
  if (screen === "review") renderReview();
  if (screen === "receipt") renderReceipt();
}

await Network.addListener("networkStatusChange", async (status) => {
  online = status.connected;
  if (online) await syncOutbox();
  render();
});
await App.addListener("resume", async () => {
  online = (await Network.getStatus()).connected;
  if (online) await syncOutbox();
  render();
});

render();
