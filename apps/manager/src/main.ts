import type { AuthenticatedUser, ManagerDashboard } from "@checklist/contracts";
import "./styles.css";

const element = document.querySelector<HTMLDivElement>("#app");
if (!element) throw new Error("APP_ROOT_NOT_FOUND");
const root: HTMLDivElement = element;
const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8095").replace(/\/+$/, "");
let token = "";
let user: AuthenticatedUser | null = null;
let dashboard: ManagerDashboard | null = null;
let errorMessage = "";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Não foi possível carregar os dados.");
  return body;
}

async function loadDashboard() {
  const body = await request<{ dashboard: ManagerDashboard }>("/v1/manager/dashboard");
  dashboard = body.dashboard;
}

function renderLogin() {
  root.innerHTML = `<main><section class="card login">
    <p class="eyebrow">Acesso restrito</p><h1>Painel do gestor</h1>
    <p class="muted">Resultados e planos de ação são exibidos apenas para perfis autorizados.</p>
    <form id="login"><div class="field"><label for="email">E-mail corporativo</label>
      <input id="email" name="email" type="email" required value="${escapeHtml(import.meta.env.VITE_MANAGER_EMAIL || "gestor@paranaiba.local")}">
    </div><p class="error">${escapeHtml(errorMessage)}</p><button>Entrar</button></form>
  </section></main>`;
  document.querySelector("#login")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const email = String(new FormData(event.currentTarget as HTMLFormElement).get("email") ?? "");
      const response = await fetch(`${apiUrl}/v1/dev/session`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { accessToken?: string; user?: AuthenticatedUser; message?: string };
      if (!response.ok || !body.accessToken || !body.user) throw new Error(body.message ?? "Acesso negado.");
      token = body.accessToken;
      user = body.user;
      await loadDashboard();
      errorMessage = "";
      renderDashboard();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Não foi possível entrar.";
      renderLogin();
    }
  });
}

function renderDashboard() {
  if (!dashboard || !user) return renderLogin();
  root.innerHTML = `<div class="shell">
    <header><strong>Checklist Paranaíba · Gestão</strong><span>${escapeHtml(user.name)}</span></header>
    <main><p class="eyebrow">Visão gerencial</p><h1>Operação das unidades</h1>
      <section class="metrics">
        <article class="card metric"><span class="muted">Tarefas abertas</span><strong>${dashboard.openAssignments}</strong></article>
        <article class="card metric"><span class="muted">Enviados hoje</span><strong>${dashboard.submittedToday}</strong></article>
        <article class="card metric"><span class="muted">Planos em aberto</span><strong>${dashboard.openActionPlans}</strong></article>
        <article class="card metric"><span class="muted">Sincronizações pendentes</span><strong>${dashboard.pendingSync}</strong></article>
      </section>
      <div class="toolbar"><div><h2>Execuções recentes</h2><span class="muted">Avaliação calculada exclusivamente no servidor</span></div>
        <button id="refresh" class="secondary">Atualizar</button></div>
      <section class="card table-wrap">${dashboard.recentExecutions.length ? `<table>
        <thead><tr><th>Checklist</th><th>Colaborador</th><th>Unidade</th><th>Enviado</th><th>Nota</th><th>Desvios</th><th>Planos</th></tr></thead>
        <tbody>${dashboard.recentExecutions.map((item) => `<tr>
          <td>${escapeHtml(item.templateName)}</td><td>${escapeHtml(item.operatorName)}</td><td>${escapeHtml(item.storeName)}</td>
          <td>${new Date(item.submittedAt).toLocaleString("pt-BR")}</td><td class="score">${item.score}%</td>
          <td>${item.nonconformCount}</td><td>${item.actionPlanCount}</td></tr>`).join("")}</tbody>
      </table>` : `<div class="empty">Nenhuma execução recebida ainda.</div>`}</section>
      <p class="error">${escapeHtml(errorMessage)}</p>
    </main></div>`;
  document.querySelector("#refresh")?.addEventListener("click", async () => {
    try { await loadDashboard(); errorMessage = ""; } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Falha ao atualizar.";
    }
    renderDashboard();
  });
}

renderLogin();
