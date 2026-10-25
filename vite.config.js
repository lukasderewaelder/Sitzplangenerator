import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Die App wird zu EINER index.html im Repo-Stamm gebaut (CSS, Skripte und Schrift eingebettet).
// So läuft sie weiter auch direkt aus einer Datei und auf GitHub Pages ohne weitere Einstellungen.
export default defineConfig({
  root: "app",
  base: "./",
  publicDir: false,
  plugins: [viteSingleFile()],
  build: {
    outDir: "..",
    emptyOutDir: false,
    target: "es2020",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
