import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ApiErrorBody, ExecutionSubmission } from "@checklist/contracts";
import { authenticate, isDevelopmentAuthEnabled, issueDevelopmentToken } from "./auth.js";
import {
  createAssignment,
  getManagerDashboard,
  getUserByEmail,
  listOperatorAssignments,
  openDatabase,
  submitExecution,
  type ApiDatabase,
} from "./database.js";

const maximumBodyBytes = 1_000_000;
const defaultAllowedOrigins = [
  "http://127.0.0.1:5174",
  "http://localhost:5174",
  "http://127.0.0.1:5175",
  "http://localhost:5175",
  "capacitor://localhost",
  "https://localhost",
];

function allowedOrigins() {
  return new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? defaultAllowedOrigins.join(","))
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function applyHeaders(response: ServerResponse, origin?: string) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  if (origin && allowedOrigins().has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Vary", "Origin");
  }
}

function json(response: ServerResponse, status: number, body: unknown, origin?: string) {
  applyHeaders(response, origin);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maximumBodyBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function errorResponse(error: unknown, requestId: string): { status: number; body: ApiErrorBody } {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const [rawCode, details] = message.split(":", 2);
  const code = rawCode ?? "INTERNAL_ERROR";
  const statuses: Record<string, number> = {
    UNAUTHENTICATED: 401,
    USER_NOT_PROVISIONED: 403,
    FORBIDDEN: 403,
    ASSIGNMENT_NOT_FOUND: 404,
    ASSIGNMENT_REVOKED: 409,
    IDEMPOTENCY_CONFLICT: 409,
    TEMPLATE_VERSION_MISMATCH: 409,
    OPERATOR_NOT_ALLOWED: 422,
    TEMPLATE_NOT_FOUND: 422,
    MISSING_ANSWERS: 422,
    INVALID_JSON: 400,
    PAYLOAD_TOO_LARGE: 413,
    DEVELOPMENT_AUTH_DISABLED: 404,
  };
  const publicMessages: Record<string, string> = {
    UNAUTHENTICATED: "Autenticação necessária.",
    USER_NOT_PROVISIONED: "Usuário sem acesso provisionado.",
    FORBIDDEN: "Acesso não permitido.",
    ASSIGNMENT_NOT_FOUND: "Tarefa não encontrada.",
    ASSIGNMENT_REVOKED: "A tarefa foi revogada e precisa de revisão.",
    IDEMPOTENCY_CONFLICT: "A mesma chave de envio foi usada com conteúdo diferente.",
    TEMPLATE_VERSION_MISMATCH: "A versão do checklist não corresponde à tarefa.",
    OPERATOR_NOT_ALLOWED: "O operador não pertence à unidade selecionada.",
    TEMPLATE_NOT_FOUND: "Versão do checklist não encontrada.",
    MISSING_ANSWERS: "Existem respostas obrigatórias pendentes.",
    INVALID_JSON: "Conteúdo JSON inválido.",
    PAYLOAD_TOO_LARGE: "Conteúdo acima do limite permitido.",
    DEVELOPMENT_AUTH_DISABLED: "Rota indisponível.",
  };
  return {
    status: statuses[code] ?? 500,
    body: {
      error: code,
      message: publicMessages[code] ?? "Não foi possível concluir a solicitação.",
      requestId,
      ...(details ? { details: details.split(",") } : {}),
    },
  };
}

function validateSubmission(input: unknown): ExecutionSubmission {
  if (!input || typeof input !== "object") throw new Error("INVALID_JSON");
  const payload = input as Partial<ExecutionSubmission>;
  if (
    !payload.executionId ||
    !payload.assignmentId ||
    !payload.templateVersionId ||
    !payload.deviceId ||
    !payload.startedAt ||
    !payload.completedAt ||
    !Array.isArray(payload.answers)
  ) {
    throw new Error("INVALID_JSON");
  }
  return payload as ExecutionSubmission;
}

export function createApiServer(database: ApiDatabase = openDatabase()) {
  const server = createServer(async (request, response) => {
    const requestId = randomUUID();
    const origin = request.headers.origin;
    response.setHeader("X-Request-Id", requestId);
    try {
      const url = new URL(request.url ?? "/", "http://api.local");
      if (request.method === "OPTIONS") {
        applyHeaders(response, origin);
        response.statusCode = origin && allowedOrigins().has(origin) ? 204 : 403;
        response.end();
        return;
      }
      if (url.pathname === "/health" && request.method === "GET") {
        json(response, 200, { status: "ok", time: new Date().toISOString() }, origin);
        return;
      }
      if (url.pathname === "/v1/config" && request.method === "GET") {
        json(response, 200, { developmentAuth: isDevelopmentAuthEnabled() }, origin);
        return;
      }
      if (url.pathname === "/v1/dev/session" && request.method === "POST") {
        if (!isDevelopmentAuthEnabled()) throw new Error("DEVELOPMENT_AUTH_DISABLED");
        const body = (await readJson(request)) as { email?: string };
        const user = body.email ? getUserByEmail(database.raw, body.email.toLowerCase()) : null;
        if (!user) throw new Error("USER_NOT_PROVISIONED");
        const accessToken = await issueDevelopmentToken(user);
        json(response, 200, { accessToken, expiresIn: 28_800, user }, origin);
        return;
      }

      const user = await authenticate(database, request.headers.authorization);
      if (url.pathname === "/v1/me" && request.method === "GET") {
        json(response, 200, { user }, origin);
        return;
      }
      if (url.pathname === "/v1/operator/assignments" && request.method === "GET") {
        if (user.role !== "operator") throw new Error("FORBIDDEN");
        json(response, 200, { assignments: listOperatorAssignments(database.raw, user) }, origin);
        return;
      }
      if (url.pathname === "/v1/operator/executions" && request.method === "POST") {
        const idempotencyKey = request.headers["idempotency-key"];
        if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16) {
          json(
            response,
            400,
            { error: "INVALID_IDEMPOTENCY_KEY", message: "Chave de envio inválida.", requestId },
            origin,
          );
          return;
        }
        const payload = validateSubmission(await readJson(request));
        const receipt = submitExecution(database.raw, user, payload, idempotencyKey, requestId);
        json(response, 201, { receipt }, origin);
        return;
      }
      if (url.pathname === "/v1/manager/dashboard" && request.method === "GET") {
        json(response, 200, { dashboard: getManagerDashboard(database.raw, user) }, origin);
        return;
      }
      if (url.pathname === "/v1/manager/assignments" && request.method === "POST") {
        const input = (await readJson(request)) as {
          operatorId?: string;
          storeId?: string;
          templateVersionId?: string;
          dueAt?: string;
        };
        if (!input.operatorId || !input.storeId || !input.templateVersionId || !input.dueAt) {
          throw new Error("INVALID_JSON");
        }
        const assignment = createAssignment(database.raw, user, input as Required<typeof input>, requestId);
        json(response, 201, { assignment }, origin);
        return;
      }

      json(response, 404, { error: "NOT_FOUND", message: "Rota não encontrada.", requestId }, origin);
    } catch (error) {
      const mapped = errorResponse(error, requestId);
      if (mapped.status >= 500) console.error({ requestId, error });
      json(response, mapped.status, mapped.body, origin);
    }
  });
  server.on("close", () => database.close());
  return { server, database };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.API_HOST ?? "127.0.0.1";
  const port = Number(process.env.API_PORT ?? 8095);
  const { server } = createApiServer();
  server.listen(port, host, () => {
    console.log(`Checklist API disponível em http://${host}:${port}`);
  });
}
