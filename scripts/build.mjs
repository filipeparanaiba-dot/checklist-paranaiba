import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "dist", "server");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "core.js",
  "db.js",
  "sw.js",
  "manifest.json",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/og.png",
];

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
};

const assets = {};
for (const file of files) {
  const bytes = await readFile(resolve(root, file));
  const extension = file.slice(file.lastIndexOf("."));
  assets[`/${file.replaceAll("\\", "/")}`] = {
    body: bytes.toString("base64"),
    type: contentTypes[extension] ?? "application/octet-stream",
  };
}

const worker = `const ASSETS = ${JSON.stringify(assets)};
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Método não permitido.", {
        status: 405,
        headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = ASSETS[path];
    if (!asset) {
      if (request.headers.get("Accept")?.includes("text/html")) {
        const shell = ASSETS["/index.html"];
        return new Response(request.method === "HEAD" ? null : decodeBase64(shell.body), {
          status: 200,
          headers: { ...SECURITY_HEADERS, "Cache-Control": "no-cache", "Content-Type": shell.type }
        });
      }
      return new Response("Arquivo não encontrado.", {
        status: 404,
        headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    return new Response(request.method === "HEAD" ? null : decodeBase64(asset.body), {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        "Cache-Control": path === "/index.html" || path === "/sw.js" ? "no-cache" : "public, max-age=3600",
        "Content-Type": asset.type,
        "Service-Worker-Allowed": "/"
      }
    });
  }
};
`;

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "index.js"), worker, "utf8");
console.log(`Build concluído: ${files.length} recursos incorporados.`);
