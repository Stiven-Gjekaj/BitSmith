/**
 * Serves the built site the way GitHub Pages serves it.
 *
 * Usage:  node scripts/serve-dist.mjs [port]
 *
 * `astro preview` cannot be used for this. Astro 7 runs it as a daemon: the
 * command returns at once and the server carries on in the background, which
 * a test runner reads as a server that died on startup.
 *
 * Serving the files here is also the more honest test. GitHub Pages is a dumb
 * static file host under a path prefix, and that is exactly what this is. A
 * development server that rewrites requests would hide a broken base path,
 * and a broken base path is a failure that builds cleanly and breaks every
 * link in production.
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const BASE = "/bitsmith";
const ROOT = join(process.cwd(), "dist");
const PORT = Number(process.argv[2] ?? 4173);

// The type matters. A `.wasm` served as text is refused by the browser, and a
// `.mjs` served as plain text never runs, which is how a runtime that looks
// present fails to start.
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);

  if (path === BASE) {
    response.writeHead(301, { Location: `${BASE}/` });
    response.end();
    return;
  }

  if (!path.startsWith(`${BASE}/`)) {
    response.writeHead(404).end("Not found");
    return;
  }

  path = path.slice(BASE.length);

  // Refuse anything that climbs out of the directory.
  const target = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  if (!target.startsWith(ROOT)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  let file = target;
  try {
    if (statSync(file).isDirectory()) {
      // GitHub Pages sends a redirect when a directory is asked for without
      // its trailing slash, and the site is built with trailing slashes. A
      // server that answered directly here would let a link pass in testing
      // and fail in production.
      if (!path.endsWith("/")) {
        response.writeHead(301, { Location: `${BASE}${path}/` });
        response.end();
        return;
      }
      file = join(file, "index.html");
    }
    statSync(file);
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving dist/ at http://127.0.0.1:${PORT}${BASE}/`);
});
