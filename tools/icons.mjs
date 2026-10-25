// Erzeugt die PNG-Symbole der App aus den SVG-Vorlagen (app/static/icons/*.svg).
// Aufruf: node tools/icons.mjs   (braucht Chrome/Edge bzw. Playwright-Chromium)
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const ordner = "app/static/icons/";
const rund = await readFile(ordner + "icon.svg", "utf8");
const voll = await readFile(ordner + "icon-vollflaechig.svg", "utf8");
const ZIELE = [
  ["icon-192.png", rund, 192, true],
  ["icon-512.png", rund, 512, true],
  ["icon-maskable-512.png", voll, 512, false],
  ["apple-touch-icon.png", voll, 180, false],
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? (process.env.CI ? undefined : "msedge") });
for (const [datei, svg, groesse, transparent] of ZIELE) {
  const seite = await browser.newPage({ viewport: { width: groesse, height: groesse } });
  await seite.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${groesse}px;height:${groesse}px}</style>${svg}`);
  await writeFile(ordner + datei, await seite.screenshot({ omitBackground: transparent, type: "png" }));
  await seite.close();
}
await browser.close();
console.log("Symbole erzeugt:", ZIELE.map((z) => z[0]).join(", "));
