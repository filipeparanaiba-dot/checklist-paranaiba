import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMargin,
  classifyHealth,
  createInitialWorkspace,
  csvEscape,
  deriveStoreMetrics,
  validateEan13,
} from "../core.js";

test("calcula margem sobre o preço de venda", () => {
  assert.equal(calculateMargin(3.2, 4.99)?.toFixed(1), "35.9");
  assert.equal(calculateMargin(5, 0), null);
  assert.equal(calculateMargin(-1, 10), null);
});

test("classifica o índice de saúde de forma consistente", () => {
  assert.deepEqual(classifyHealth(94), { label: "Excelente", tone: "success" });
  assert.deepEqual(classifyHealth(88), { label: "Atenção", tone: "warning" });
  assert.deepEqual(classifyHealth(50), { label: "Crítico", tone: "danger" });
});

test("valida EAN-13 pelo dígito verificador", () => {
  assert.equal(validateEan13("7891000100103"), true);
  assert.equal(validateEan13("7891000100104"), false);
  assert.equal(validateEan13("123"), false);
});

test("escapa células CSV", () => {
  assert.equal(csvEscape('Produto "A"'), '"Produto ""A"""');
});

test("cria workspace versionado e calcula métricas por loja", () => {
  const now = new Date("2026-07-28T12:00:00-03:00");
  const workspace = createInitialWorkspace(now);
  workspace.audits.push({
    id: "audit-1",
    storeId: "2",
    createdAt: now.toISOString(),
    answers: [
      { choice: "conform" },
      { choice: "conform" },
      { choice: "nonconform" },
    ],
  });

  const metrics = deriveStoreMetrics(workspace, "2");
  assert.equal(metrics.score, 67);
  assert.equal(metrics.conform, 2);
  assert.equal(metrics.nonconform, 1);
  assert.equal(metrics.auditsToday, 1);
});

