import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "out");
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "127.0.0.1";
const TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function resolveFile(urlPath: string): Promise<string | null> {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const requested = path.resolve(ROOT, `.${decodedPath}`);
  if (requested !== ROOT && !requested.startsWith(`${ROOT}${path.sep}`)) return null;

  const candidates = [requested, path.join(requested, "index.html")];
  if (!path.extname(requested)) candidates.push(`${requested}.html`);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next static-export candidate.
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? "/");
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
    return;
  }

  const extension = path.extname(file);
  response.writeHead(200, {
    "Content-Type": TYPES[extension] ?? "application/octet-stream",
    "Cache-Control": file.endsWith("sw.js") ? "no-cache" : "public, max-age=0, must-revalidate",
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`Adivina la peli disponible en http://${HOST}:${PORT}`);
});
