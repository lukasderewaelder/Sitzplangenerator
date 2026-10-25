import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createHash } from "node:crypto";
import { cpSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// alle Dateien eines Ordners (für die Prüfsumme der Versionskennung)
function dateienIn(ordner) {
  return readdirSync(ordner).sort().flatMap((n) => {
    const pfad = join(ordner, n);
    return statSync(pfad).isDirectory() ? dateienIn(pfad) : [pfad];
  });
}

const paket = JSON.parse(readFileSync("package.json", "utf8"));

// Nach dem Bau: Manifest und Symbole in den Stamm kopieren und den Service Worker mit einer
// Versionskennung (Prüfsumme der gebauten index.html) erzeugen.
function pwaDateien() {
  let ziel;
  return {
    name: "pwa-dateien",
    apply: "build",
    configResolved(c) {
      ziel = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      cpSync("app/static", ziel, { recursive: true });
      // Prüfsumme über Seite UND statische Dateien, damit auch geänderte Symbole eine neue Version auslösen
      const summe = createHash("sha256").update(readFileSync(resolve(ziel, "index.html")));
      for (const datei of dateienIn("app/static")) summe.update(readFileSync(datei));
      const version = paket.version + "-" + summe.digest("hex").slice(0, 10);
      const vorlage = readFileSync("app/sw.template.js", "utf8");
      writeFileSync(resolve(ziel, "sw.js"), vorlage.replace("__VERSION__", version));
    },
  };
}

// Die App wird zu EINER index.html im Repo-Stamm gebaut (CSS, Skripte und Schrift eingebettet).
// So läuft sie weiter auch direkt aus einer Datei und auf GitHub Pages ohne weitere Einstellungen.
export default defineConfig({
  root: "app",
  base: "./",
  publicDir: false,
  define: { __APP_VERSION__: JSON.stringify(paket.version) },
  plugins: [viteSingleFile(), pwaDateien()],
  build: {
    outDir: "..",
    emptyOutDir: false,
    target: "es2020",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
