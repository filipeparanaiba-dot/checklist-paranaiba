import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type {
  AuthenticatedUser,
  ExecutionSubmission,
  ManagerDashboard,
  ManagerExecutionSummary,
  OperatorAssignment,
  OperatorQuestion,
  SyncReceipt,
} from "@checklist/contracts";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(moduleDirectory, "..");

export interface ApiDatabase {
  raw: DatabaseSync;
  close(): void;
}

type SqlRow = Record<string, unknown>;

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function openDatabase(databasePath = process.env.API_DATABASE_PATH ?? resolve(apiRoot, "data", "api.sqlite")): ApiDatabase {
  if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
  const raw = new DatabaseSync(databasePath);
  const schema = readFileSync(resolve(apiRoot, "db", "schema.sql"), "utf8");
  raw.exec(schema);
  seedDatabase(raw);
  return { raw, close: () => raw.close() };
}

function seedDatabase(database: DatabaseSync) {
  const now = new Date().toISOString();
  const dueAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const templateContent = JSON.stringify({
    name: "Açougue e câmaras frias",
    version: 1,
    questions: ["temperature", "sanitation", "traceability"],
  });
  const contentHash = createHash("sha256").update(templateContent).digest("hex");

  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT OR IGNORE INTO stores (id, name) VALUES (?, ?)").run("store-centro", "Loja 1 — Centro");
    database.prepare("INSERT OR IGNORE INTO stores (id, name) VALUES (?, ?)").run("store-bairro", "Loja 2 — Bairro");

    const users = [
      ["user-operator", "operador@paranaiba.local", "Operador de demonstração", "operator"],
      ["user-manager", "gestor@paranaiba.local", "Gestor de demonstração", "manager"],
      ["user-admin", "admin@paranaiba.local", "Administrador de demonstração", "admin"],
    ];
    const insertUser = database.prepare(
      "INSERT OR IGNORE INTO users (id, email, name, role, active) VALUES (?, ?, ?, ?, 1)",
    );
    for (const user of users) insertUser.run(...user);

    const insertMembership = database.prepare(
      "INSERT OR IGNORE INTO store_memberships (user_id, store_id) VALUES (?, ?)",
    );
    insertMembership.run("user-operator", "store-centro");
    insertMembership.run("user-manager", "store-centro");
    insertMembership.run("user-admin", "store-centro");
    insertMembership.run("user-admin", "store-bairro");

    database.prepare(
      "INSERT OR IGNORE INTO checklist_templates (id, name, sector, active) VALUES (?, ?, ?, 1)",
    ).run("template-butchery", "Açougue e câmaras frias", "Açougue");
    database.prepare(
      `INSERT OR IGNORE INTO checklist_template_versions
       (id, template_id, version, estimated_minutes, content_hash, published_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("template-butchery-v1", "template-butchery", 1, 8, contentHash, now);

    const insertQuestion = database.prepare(
      `INSERT OR IGNORE INTO questions
       (id, template_version_id, position, prompt, kind, required, unit, options_json, help,
        evaluation_rule_json, weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertQuestion.run(
      "question-temperature",
      "template-butchery-v1",
      1,
      "Registre a temperatura exibida na câmara de resfriados.",
      "number",
      1,
      "°C",
      null,
      "Digite exatamente o valor mostrado no equipamento.",
      JSON.stringify({ operation: "between", minimum: 0, maximum: 4 }),
      2,
    );
    insertQuestion.run(
      "question-sanitation",
      "template-butchery-v1",
      2,
      "A higienização de facas foi registrada no turno atual?",
      "boolean",
      1,
      null,
      null,
      "Consulte o registro do setor antes de responder.",
      JSON.stringify({ operation: "equals", value: true }),
      1,
    );
    insertQuestion.run(
      "question-traceability",
      "template-butchery-v1",
      3,
      "Como estão identificados os produtos abertos?",
      "choice",
      1,
      null,
      JSON.stringify(["Com lote e validade", "Identificação incompleta", "Sem identificação", "Não foi possível verificar"]),
      null,
      JSON.stringify({ operation: "equals", value: "Com lote e validade" }),
      1,
    );

    database.prepare(
      `INSERT OR IGNORE INTO assignments
       (id, template_version_id, store_id, operator_id, due_at, state, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?)`,
    ).run(
      "assignment-demo-today",
      "template-butchery-v1",
      "store-centro",
      "user-operator",
      dueAt,
      "user-manager",
      now,
    );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getUserById(database: DatabaseSync, userId: string): AuthenticatedUser | null {
  const row = database.prepare(
    "SELECT id, email, name, role FROM users WHERE id = ? AND active = 1",
  ).get(userId) as SqlRow | undefined;
  if (!row) return null;
  const memberships = database.prepare(
    "SELECT store_id FROM store_memberships WHERE user_id = ? ORDER BY store_id",
  ).all(userId) as SqlRow[];
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as AuthenticatedUser["role"],
    storeIds: memberships.map((membership) => String(membership.store_id)),
  };
}

export function getUserByEmail(database: DatabaseSync, email: string): AuthenticatedUser | null {
  const row = database.prepare("SELECT id FROM users WHERE email = ? AND active = 1").get(email) as
    | SqlRow
    | undefined;
  return row ? getUserById(database, String(row.id)) : null;
}

function questionFromRow(row: SqlRow): OperatorQuestion {
  const question: OperatorQuestion = {
    id: String(row.id),
    prompt: String(row.prompt),
    kind: row.kind as OperatorQuestion["kind"],
    required: Boolean(row.required),
  };
  if (row.unit) question.unit = String(row.unit);
  if (row.help) question.help = String(row.help);
  const options = parseJson<string[]>(row.options_json, []);
  if (options.length > 0) question.options = options;
  return question;
}

export function listOperatorAssignments(database: DatabaseSync, user: AuthenticatedUser): OperatorAssignment[] {
  if (user.role !== "operator") return [];
  const rows = database.prepare(
    `SELECT
       a.id, a.store_id, s.name AS store_name, a.due_at, a.state,
       t.id AS template_id, t.name AS template_name, t.sector,
       tv.id AS template_version_id, tv.version AS template_version,
       tv.estimated_minutes
     FROM assignments a
     JOIN stores s ON s.id = a.store_id
     JOIN checklist_template_versions tv ON tv.id = a.template_version_id
     JOIN checklist_templates t ON t.id = tv.template_id
     WHERE a.operator_id = ? AND a.state IN ('assigned', 'in_progress')
     ORDER BY a.due_at`,
  ).all(user.id) as SqlRow[];

  const questionStatement = database.prepare(
    `SELECT id, prompt, kind, required, unit, options_json, help
     FROM questions WHERE template_version_id = ? ORDER BY position`,
  );

  return rows.map((row) => ({
    id: String(row.id),
    storeId: String(row.store_id),
    storeName: String(row.store_name),
    sector: String(row.sector),
    dueAt: String(row.due_at),
    state: row.state as OperatorAssignment["state"],
    templateId: String(row.template_id),
    templateVersionId: String(row.template_version_id),
    templateName: String(row.template_name),
    templateVersion: Number(row.template_version),
    estimatedMinutes: Number(row.estimated_minutes),
    questions: (questionStatement.all(String(row.template_version_id)) as SqlRow[]).map(questionFromRow),
  }));
}

function evaluateRule(rule: Record<string, unknown>, value: unknown): { conform: boolean; reason: string } {
  if (rule.operation === "between") {
    const number = Number(value);
    const minimum = Number(rule.minimum);
    const maximum = Number(rule.maximum);
    const conform = Number.isFinite(number) && number >= minimum && number <= maximum;
    return { conform, reason: conform ? "Valor dentro do intervalo." : "Valor fora do intervalo definido." };
  }
  if (rule.operation === "equals") {
    const conform = value === rule.value;
    return { conform, reason: conform ? "Observação atende ao critério." : "Observação não atende ao critério." };
  }
  return { conform: true, reason: "Item informativo sem regra de classificação." };
}

function stableRequestHash(payload: ExecutionSubmission) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function submitExecution(
  database: DatabaseSync,
  user: AuthenticatedUser,
  payload: ExecutionSubmission,
  idempotencyKey: string,
  requestId: string,
): SyncReceipt {
  if (user.role !== "operator") throw new Error("FORBIDDEN");
  const requestHash = stableRequestHash(payload);
  const previous = database.prepare(
    `SELECT request_hash, response_json FROM idempotency_records
     WHERE user_id = ? AND idempotency_key = ?`,
  ).get(user.id, idempotencyKey) as SqlRow | undefined;
  if (previous) {
    if (previous.request_hash !== requestHash) throw new Error("IDEMPOTENCY_CONFLICT");
    return parseJson<SyncReceipt>(previous.response_json, {} as SyncReceipt);
  }

  const assignment = database.prepare(
    `SELECT id, operator_id, store_id, template_version_id, state
     FROM assignments WHERE id = ?`,
  ).get(payload.assignmentId) as SqlRow | undefined;
  if (!assignment || assignment.operator_id !== user.id) throw new Error("ASSIGNMENT_NOT_FOUND");
  if (!user.storeIds.includes(String(assignment.store_id))) throw new Error("FORBIDDEN");
  if (assignment.state === "revoked") throw new Error("ASSIGNMENT_REVOKED");
  if (assignment.template_version_id !== payload.templateVersionId) throw new Error("TEMPLATE_VERSION_MISMATCH");

  const questionRows = database.prepare(
    `SELECT id, prompt, required, evaluation_rule_json, weight
     FROM questions WHERE template_version_id = ? ORDER BY position`,
  ).all(payload.templateVersionId) as SqlRow[];
  const answerMap = new Map(payload.answers.map((answer) => [answer.questionId, answer]));
  const missing = questionRows.filter((question) => Boolean(question.required) && !answerMap.has(String(question.id)));
  if (missing.length > 0) throw new Error(`MISSING_ANSWERS:${missing.map((item) => item.id).join(",")}`);

  const evaluatedAt = new Date().toISOString();
  const protocol = `CHK-${evaluatedAt.slice(0, 10).replaceAll("-", "")}-${payload.executionId.slice(-8).toUpperCase()}`;
  const receipt: SyncReceipt = {
    operationId: idempotencyKey,
    executionId: payload.executionId,
    protocol,
    receivedAt: evaluatedAt,
  };

  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(
      `INSERT INTO executions
       (id, assignment_id, operator_id, store_id, template_version_id, device_id,
        started_at, completed_at, received_at, protocol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      payload.executionId,
      payload.assignmentId,
      user.id,
      String(assignment.store_id),
      payload.templateVersionId,
      payload.deviceId,
      payload.startedAt,
      payload.completedAt,
      evaluatedAt,
      protocol,
    );

    const insertAnswer = database.prepare(
      `INSERT INTO answers (execution_id, question_id, value_json, observed_at)
       VALUES (?, ?, ?, ?)`,
    );
    const insertEvaluationItem = database.prepare(
      `INSERT INTO evaluation_items (execution_id, question_id, conform, reason)
       VALUES (?, ?, ?, ?)`,
    );
    const insertAction = database.prepare(
      `INSERT INTO action_plans
       (id, execution_id, question_id, store_id, title, state, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    );

    let conformCount = 0;
    let nonconformCount = 0;
    let weightedConform = 0;
    let totalWeight = 0;
    for (const question of questionRows) {
      const answer = answerMap.get(String(question.id));
      if (!answer) continue;
      insertAnswer.run(
        payload.executionId,
        String(question.id),
        JSON.stringify(answer.value),
        answer.observedAt,
      );
      const rule = parseJson<Record<string, unknown>>(question.evaluation_rule_json, {});
      const result = evaluateRule(rule, answer.value);
      const weight = Number(question.weight);
      totalWeight += weight;
      if (result.conform) {
        conformCount += 1;
        weightedConform += weight;
      } else {
        nonconformCount += 1;
        insertAction.run(
          randomUUID(),
          payload.executionId,
          String(question.id),
          String(assignment.store_id),
          `Tratar desvio: ${String(question.prompt)}`,
          evaluatedAt,
        );
      }
      insertEvaluationItem.run(payload.executionId, String(question.id), result.conform ? 1 : 0, result.reason);
    }

    const score = totalWeight === 0 ? 100 : Math.round((weightedConform / totalWeight) * 100);
    database.prepare(
      `INSERT INTO evaluations
       (execution_id, score, conform_count, nonconform_count, evaluated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(payload.executionId, score, conformCount, nonconformCount, evaluatedAt);
    database.prepare("UPDATE assignments SET state = 'submitted' WHERE id = ?").run(payload.assignmentId);
    database.prepare(
      `INSERT INTO idempotency_records
       (user_id, idempotency_key, request_hash, response_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(user.id, idempotencyKey, requestHash, JSON.stringify(receipt), evaluatedAt);
    database.prepare(
      `INSERT INTO audit_events
       (id, actor_id, store_id, event_type, resource_type, resource_id, request_id,
        occurred_at, details_json)
       VALUES (?, ?, ?, 'execution.submitted', 'execution', ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      user.id,
      String(assignment.store_id),
      payload.executionId,
      requestId,
      evaluatedAt,
      JSON.stringify({ assignmentId: payload.assignmentId, templateVersionId: payload.templateVersionId }),
    );
    database.exec("COMMIT");
    return receipt;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getManagerDashboard(database: DatabaseSync, user: AuthenticatedUser): ManagerDashboard {
  if (!["manager", "admin"].includes(user.role)) throw new Error("FORBIDDEN");
  const storeIds = user.storeIds;
  if (storeIds.length === 0) {
    return { openAssignments: 0, pendingSync: 0, submittedToday: 0, openActionPlans: 0, recentExecutions: [] };
  }
  const placeholders = storeIds.map(() => "?").join(",");
  const scalar = (sql: string, ...parameters: string[]) =>
    Number((database.prepare(sql).get(...parameters) as SqlRow | undefined)?.count ?? 0);
  const todayPrefix = `${new Date().toISOString().slice(0, 10)}%`;
  const openAssignments = scalar(
    `SELECT COUNT(*) AS count FROM assignments WHERE store_id IN (${placeholders})
     AND state IN ('assigned', 'in_progress')`,
    ...storeIds,
  );
  const submittedToday = scalar(
    `SELECT COUNT(*) AS count FROM executions WHERE store_id IN (${placeholders})
     AND received_at LIKE ?`,
    ...storeIds,
    todayPrefix,
  );
  const openActionPlans = scalar(
    `SELECT COUNT(*) AS count FROM action_plans WHERE store_id IN (${placeholders}) AND state = 'open'`,
    ...storeIds,
  );
  const recentRows = database.prepare(
    `SELECT
       e.id, e.assignment_id, u.name AS operator_name, s.name AS store_name,
       t.name AS template_name, e.received_at, ev.score, ev.conform_count,
       ev.nonconform_count,
       (SELECT COUNT(*) FROM action_plans ap WHERE ap.execution_id = e.id) AS action_plan_count
     FROM executions e
     JOIN users u ON u.id = e.operator_id
     JOIN stores s ON s.id = e.store_id
     JOIN checklist_template_versions tv ON tv.id = e.template_version_id
     JOIN checklist_templates t ON t.id = tv.template_id
     JOIN evaluations ev ON ev.execution_id = e.id
     WHERE e.store_id IN (${placeholders})
     ORDER BY e.received_at DESC
     LIMIT 20`,
  ).all(...storeIds) as SqlRow[];
  const recentExecutions: ManagerExecutionSummary[] = recentRows.map((row) => ({
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    operatorName: String(row.operator_name),
    storeName: String(row.store_name),
    templateName: String(row.template_name),
    submittedAt: String(row.received_at),
    score: Number(row.score),
    conformCount: Number(row.conform_count),
    nonconformCount: Number(row.nonconform_count),
    actionPlanCount: Number(row.action_plan_count),
  }));
  return {
    openAssignments,
    pendingSync: 0,
    submittedToday,
    openActionPlans,
    recentExecutions,
  };
}

export function createAssignment(
  database: DatabaseSync,
  user: AuthenticatedUser,
  input: { operatorId: string; storeId: string; templateVersionId: string; dueAt: string },
  requestId: string,
) {
  if (!["manager", "admin"].includes(user.role) || !user.storeIds.includes(input.storeId)) {
    throw new Error("FORBIDDEN");
  }
  const operatorMembership = database.prepare(
    `SELECT 1 AS allowed FROM users u
     JOIN store_memberships sm ON sm.user_id = u.id
     WHERE u.id = ? AND u.role = 'operator' AND u.active = 1 AND sm.store_id = ?`,
  ).get(input.operatorId, input.storeId) as SqlRow | undefined;
  if (!operatorMembership) throw new Error("OPERATOR_NOT_ALLOWED");
  const template = database.prepare(
    "SELECT id FROM checklist_template_versions WHERE id = ?",
  ).get(input.templateVersionId) as SqlRow | undefined;
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  const id = randomUUID();
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(
      `INSERT INTO assignments
       (id, template_version_id, store_id, operator_id, due_at, state, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?)`,
    ).run(id, input.templateVersionId, input.storeId, input.operatorId, input.dueAt, user.id, now);
    database.prepare(
      `INSERT INTO audit_events
       (id, actor_id, store_id, event_type, resource_type, resource_id, request_id,
        occurred_at, details_json)
       VALUES (?, ?, ?, 'assignment.created', 'assignment', ?, ?, ?, ?)`,
    ).run(randomUUID(), user.id, input.storeId, id, requestId, now, JSON.stringify(input));
    database.exec("COMMIT");
    return { id, state: "assigned", createdAt: now };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
