import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createHash } from "node:crypto";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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
      const html = readFileSync(resolve(ziel, "index.html"));
      const version = paket.version + "-" + createHash("sha256").update(html).digest("hex").slice(0, 10);
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
