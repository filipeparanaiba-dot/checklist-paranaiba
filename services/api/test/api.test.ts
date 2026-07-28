import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createApiServer } from "../src/server.js";
import { openDatabase } from "../src/database.js";

async function withApi(
  run: (baseUrl: string, login: (email: string) => Promise<string>) => Promise<void>,
) {
  const database = openDatabase(":memory:");
  const { server } = createApiServer(database);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const login = async (email: string) => {
    const response = await fetch(`${baseUrl}/v1/dev/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { accessToken: string };
    return body.accessToken;
  };
  try {
    await run(baseUrl, login);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("operador recebe perguntas sem regras, pesos ou resultados", async () => {
  await withApi(async (baseUrl, login) => {
    const token = await login("operador@paranaiba.local");
    const response = await fetch(`${baseUrl}/v1/operator/assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    const raw = await response.text();
    for (const forbidden of ["evaluation_rule", "weight", '"score"', "conformCount", "nonconformCount"]) {
      assert.equal(raw.includes(forbidden), false, `campo restrito exposto: ${forbidden}`);
    }
    const body = JSON.parse(raw) as { assignments: Array<{ questions: unknown[] }> };
    assert.equal(body.assignments.length, 1);
    assert.equal(body.assignments[0]?.questions.length, 3);
  });
});

test("envio é idempotente, oculta resultado do operador e aparece para o gestor", async () => {
  await withApi(async (baseUrl, login) => {
    const operatorToken = await login("operador@paranaiba.local");
    const managerToken = await login("gestor@paranaiba.local");
    const assignmentResponse = await fetch(`${baseUrl}/v1/operator/assignments`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const assignmentBody = (await assignmentResponse.json()) as {
      assignments: Array<{
        id: string;
        templateVersionId: string;
        questions: Array<{ id: string }>;
      }>;
    };
    const assignment = assignmentBody.assignments[0];
    assert.ok(assignment);
    const now = new Date().toISOString();
    const submission = {
      executionId: "execution-test-0001",
      assignmentId: assignment.id,
      templateVersionId: assignment.templateVersionId,
      deviceId: "device-test-0001",
      startedAt: now,
      completedAt: now,
      answers: [
        { questionId: assignment.questions[0]!.id, value: 9, observedAt: now },
        { questionId: assignment.questions[1]!.id, value: false, observedAt: now },
        { questionId: assignment.questions[2]!.id, value: "Sem identificação", observedAt: now },
      ],
    };
    const submit = () =>
      fetch(`${baseUrl}/v1/operator/executions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${operatorToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "operation-test-00000001",
        },
        body: JSON.stringify(submission),
      });
    const first = await submit();
    assert.equal(first.status, 201);
    const firstRaw = await first.text();
    assert.equal(firstRaw.includes("score"), false);
    assert.equal(firstRaw.includes("conform"), false);
    const second = await submit();
    assert.equal(second.status, 201);
    assert.deepEqual(await second.json(), JSON.parse(firstRaw));

    const forbidden = await fetch(`${baseUrl}/v1/manager/dashboard`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert.equal(forbidden.status, 403);

    const dashboardResponse = await fetch(`${baseUrl}/v1/manager/dashboard`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(dashboardResponse.status, 200);
    const dashboard = (await dashboardResponse.json()) as {
      dashboard: { recentExecutions: Array<{ score: number; nonconformCount: number }> };
    };
    assert.equal(dashboard.dashboard.recentExecutions.length, 1);
    assert.equal(dashboard.dashboard.recentExecutions[0]?.score, 0);
    assert.equal(dashboard.dashboard.recentExecutions[0]?.nonconformCount, 3);
  });
});

test("produção não disponibiliza autenticação de demonstração", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAuthMode = process.env.AUTH_MODE;
  process.env.NODE_ENV = "production";
  process.env.AUTH_MODE = "oidc";
  try {
    await withApi(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/dev/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "operador@paranaiba.local" }),
      });
      assert.equal(response.status, 404);
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAuthMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previousAuthMode;
  }
});
