// Kleiner statischer Server für Vorschau und Browser-Tests: node tools/serve.mjs <Ordner> <Port>
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] || ".");
const port = Number(process.argv[3]) || 4175;
const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    let pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (pfad.endsWith("/")) pfad += "index.html";
    const datei = normalize(join(root, pfad));
    if (datei !== root && !datei.startsWith(root + sep)) throw new Error("außerhalb");
    if (!(await stat(datei)).isFile()) throw new Error("keine Datei");
    res.writeHead(200, { "Content-Type": TYPEN[extname(datei)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(await readFile(datei));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("nicht gefunden");
  }
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/ (${root})`));
