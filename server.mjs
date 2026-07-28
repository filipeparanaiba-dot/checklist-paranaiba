import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT ?? 8085);
const host = process.env.HOST ?? "127.0.0.1";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    ...securityHeaders,
    "Cache-Control": "no-store",
    "Content-Type": contentType,
  });
  response.end(body);
}

function resolveRequestPath(urlValue) {
  const url = new URL(urlValue, `http://${host}:${port}`);
  const decoded = decodeURIComponent(url.pathname);
  const requested = decoded === "/" ? "index.html" : decoded.replace(/^[/\\]+/, "");
  if (!requested || requested.includes("\0") || isAbsolute(requested)) return null;

  const candidate = resolve(root, requested);
  const relation = relative(root, candidate);
  if (relation.startsWith(`..${sep}`) || relation === ".." || isAbsolute(relation)) return null;
  if (relation.split(/[\\/]/).some((segment) => segment.startsWith("."))) return null;
  return candidate;
}

const server = createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method ?? "")) {
    send(response, 405, "Método não permitido.");
    return;
  }

  let filePath;
  try {
    filePath = resolveRequestPath(request.url ?? "/");
  } catch {
    send(response, 400, "Caminho inválido.");
    return;
  }

  if (!filePath) {
    send(response, 403, "Acesso negado.");
    return;
  }

  let fileStat;
  try {
    fileStat = statSync(filePath);
  } catch {
    send(response, 404, "Arquivo não encontrado.");
    return;
  }

  if (!fileStat.isFile()) {
    send(response, 404, "Arquivo não encontrado.");
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension) ?? "application/octet-stream";
  const noCache = extension === ".html" || filePath.endsWith("sw.js");
  response.writeHead(200, {
    ...securityHeaders,
    "Cache-Control": noCache ? "no-cache" : "public, max-age=3600",
    "Content-Length": fileStat.size,
    "Content-Type": contentType,
    "Service-Worker-Allowed": "/",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.on("error", (error) => {
  console.error(`Não foi possível iniciar o servidor: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Super Checklist disponível em http://${host}:${port}`);
});

