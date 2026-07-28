import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readme = await readFile(resolve(projectRoot, "README.md"), "utf8");

test("README descreve explicitamente o modo demonstração", () => {
  assert.match(readme, /demonstração local segura/i);
  assert.match(readme, /não são[\s>]+registros corporativos/i);
});

test("README diferencia capacidade atual e requisito de produção", () => {
  assert.match(readme, /Matriz de capacidades/);
  assert.match(readme, /O que falta para produção/);
  assert.match(readme, /Roadmap para produção/);
});

test("links locais do README apontam para arquivos existentes", async () => {
  const links = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^(?:https?:|#)/i.test(target));

  assert.ok(links.length >= 6);
  await Promise.all(
    links.map(async (target) => {
      const cleanTarget = decodeURIComponent(target.split("#")[0]);
      await assert.doesNotReject(
        access(resolve(projectRoot, cleanTarget)),
        `Link local ausente: ${target}`,
      );
    }),
  );
});

test("documentos operacionais essenciais estão presentes", async () => {
  await Promise.all(
    [
      "CHANGELOG.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      "docs/ARCHITECTURE.md",
      "docs/IMPLEMENTATION_LOG.md",
      "docs/OPERATIONS.md",
      ".github/workflows/ci.yml",
    ].map((path) => access(resolve(projectRoot, path))),
  );
});
