import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, app, manifestText, serviceWorker, server] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../manifest.json", import.meta.url), "utf8"),
  readFile(new URL("../sw.js", import.meta.url), "utf8"),
  readFile(new URL("../server.mjs", import.meta.url), "utf8"),
]);

const expectedViews = [
  "dashboard",
  "rotinas",
  "treinamento",
  "furtos",
  "epi",
  "fornecedores",
  "analytics",
  "manutencao",
  "builder",
  "5w2h",
  "perdas",
  "whatsapp",
  "ranking",
];

test("todos os módulos possuem uma tela real", () => {
  expectedViews.forEach((view) => {
    assert.match(html, new RegExp(`id=["']view-${view}["']`));
  });
});

test("referências literais do JavaScript apontam para IDs existentes", () => {
  const ids = new Set(
    [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]),
  );
  const references = [
    ...app.matchAll(/\bbyId\(["']([^"']+)["']\)/g),
  ].map((match) => match[1]);

  assert.ok(references.length > 40);
  references.forEach((reference) => {
    assert.equal(ids.has(reference), true, `ID ausente no HTML: ${reference}`);
  });
});

test("HTML não usa handlers inline nem bloqueia zoom", () => {
  assert.doesNotMatch(html, /\son(?:click|change|input|submit)=/i);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(html, /maximum-scale\s*=\s*1/i);
});

test("controles de formulário visíveis possuem rótulo associado", () => {
  const controls = [
    ...html.matchAll(/<(input|select|textarea)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi),
  ]
    .map((match) => match[2])
    .filter((id) => id !== "backup-file");

  assert.ok(controls.length > 25);
  controls.forEach((id) => {
    assert.match(html, new RegExp(`<label[^>]+for=["']${id}["']`, "i"));
  });
});

test("código não injeta dados com innerHTML", () => {
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(app, /insertAdjacentHTML/);
});

test("interações não dependem de Element.closest", () => {
  assert.doesNotMatch(app, /\.closest\(/);
  assert.match(app, /function findDataTarget/);
});

test("scripts e estilos executáveis são locais", () => {
  const executableUrls = [
    ...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi),
  ].map((match) => match[1]);
  executableUrls.forEach((url) => {
    assert.equal(/^https?:\/\//i.test(url), false, `Recurso externo encontrado: ${url}`);
  });
});

test("manifesto usa ícones locais e não força orientação", () => {
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.orientation, "any");
  assert.ok(manifest.icons.length >= 3);
  manifest.icons.forEach((icon) => {
    assert.equal(/^https?:\/\//i.test(icon.src), false);
  });
});

test("service worker remove somente caches pertencentes ao projeto", () => {
  assert.match(serviceWorker, /startsWith\(CACHE_PREFIX\)/);
  assert.doesNotMatch(serviceWorker, /keys\.map\(\(key\)\s*=>\s*caches\.delete/);
  assert.doesNotMatch(serviceWorker, /registration\.unregister/);
});

test("servidor contém caminhos e aplica cabeçalhos defensivos", () => {
  assert.match(server, /relative\(root, candidate\)/);
  assert.match(server, /Content-Security-Policy/);
  assert.match(server, /X-Content-Type-Options/);
  assert.doesNotMatch(server, /D:\\\\PARANAIBA/i);
});

test("folha de estilos cobre foco e redução de movimento", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
