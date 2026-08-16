import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "out");
const SERVICE_WORKER_PATH = path.join(OUTPUT_DIRECTORY, "sw.js");
const CACHEABLE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".png",
  ".svg",
  ".txt",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
]);

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
    }),
  );
  return nested.flat();
}

const files = await walk(OUTPUT_DIRECTORY);
const assets = files
  .filter((file) => file !== SERVICE_WORKER_PATH)
  .filter((file) => CACHEABLE_EXTENSIONS.has(path.extname(file)))
  .map((file) => `/${path.relative(OUTPUT_DIRECTORY, file).split(path.sep).join("/")}`)
  .sort();

if (assets.includes("/index.html")) assets.unshift("/");

const uniqueAssets = [...new Set(assets)];
const buildHash = createHash("sha256").update(uniqueAssets.join("\n")).digest("hex").slice(0, 12);
const source = await readFile(SERVICE_WORKER_PATH, "utf8");
const withCacheName = source.replace("adivinalapeli-dev", `adivinalapeli-${buildHash}`);
const generated = withCacheName.replace(
  /const PRECACHE_ASSETS = \[[\s\S]*?\]; \/\/ __ADIVINA_PRECACHE__/,
  `const PRECACHE_ASSETS = ${JSON.stringify(uniqueAssets)}; // __ADIVINA_PRECACHE__`,
);

await writeFile(SERVICE_WORKER_PATH, generated, "utf8");
console.log(`Service worker preparado: ${uniqueAssets.length} recursos (${buildHash}).`);
