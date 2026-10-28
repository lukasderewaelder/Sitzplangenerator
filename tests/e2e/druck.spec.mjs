// Ausdruck/PDF: auf die genutzte Fläche zugeschnitten, so groß wie möglich, gleiche Ränder ringsum.
import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MM = 25.4 / 96;
const RAND = 12;

async function laden(page, pfad = "tests/fixtures/klasse-7a.json") {
  await page.goto("/");
  await expect(page.locator("#room .seat").first()).toBeVisible();
  await page.setInputFiles("#fileIn", pfad);
  await expect(page.locator("#planName")).toHaveValue("Testklasse 7a");
  await page.locator("#btnGen").click();
  await expect(page.locator('#room .seat:not([aria-label^="freier Platz"]):not(.blocked)').first()).toBeVisible();
}

/** Löst die Druckvorbereitung aus und misst die Seiten (in mm) unter Druck-Medium. */
async function seiten(page) {
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  const stil = await page.locator("#printPageStyle").textContent();
  const werte = await page.evaluate((faktor) => {
    const mm = (v) => Math.round(v * faktor * 100) / 100;
    return [...document.querySelectorAll("#printSheet .pp")].map((pp) => {
      const p = pp.getBoundingClientRect();
      const r = pp.querySelector(".proom").getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pp.querySelectorAll(".pseat,.pboard,.pdesk").forEach((n) => {
        const b = n.getBoundingClientRect();
        x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
      });
      return {
        seite: { b: mm(p.width), h: mm(p.height) },
        plan: { b: mm(r.width), h: mm(r.height) },
        inhalt: { b: mm(x1 - x0), h: mm(y1 - y0) },
        links: mm(r.left - p.left), rechts: mm(p.right - r.right), oben: mm(r.top - p.top), unten: mm(p.bottom - r.bottom),
        inhaltLinks: mm(x0 - p.left), inhaltOben: mm(y0 - p.top),
        kopf: pp.querySelector(".head").textContent,
      };
    });
  }, MM);
  return { stil, seiten: werte };
}

test.describe("Ausdruck", () => {
  test("Plan ist zugeschnitten, mittig und rundum gleich weit vom Rand", async ({ page }) => {
    await laden(page);
    const { stil, seiten: s } = await seiten(page);
    expect(s).toHaveLength(2);
    expect(stil).toContain(`margin:${RAND}mm`);
    const quer = stil.includes("landscape");
    for (const sp of s) {
      // bedruckbarer Bereich = Papier minus Rand ringsum
      expect(sp.seite.b).toBeCloseTo((quer ? 297 : 210) - 2 * RAND, 1);
      // nichts Überflüssiges: der Zuschnitt entspricht der gezeichneten Fläche
      expect(Math.abs(sp.plan.b - sp.inhalt.b)).toBeLessThan(0.6);
      expect(Math.abs(sp.plan.h - sp.inhalt.h)).toBeLessThan(0.6);
      // gleiche Ränder: links = rechts, oben = unten
      expect(Math.abs(sp.links - sp.rechts), JSON.stringify(sp)).toBeLessThan(0.3);
      expect(Math.abs(sp.oben - sp.unten), JSON.stringify(sp)).toBeLessThan(0.3);
      // so groß wie möglich: mindestens eine Richtung nutzt den Platz voll aus, nichts ragt hinaus
      expect(Math.min(sp.links, sp.oben)).toBeGreaterThanOrEqual(-0.05);
      expect(Math.min(sp.links, sp.oben)).toBeLessThan(0.6);
    }
  });

  test("leere Randzeilen und -spalten im Raum kosten keinen Platz", async ({ page }) => {
    await laden(page);
    const normal = (await seiten(page)).seiten[1];

    const roh = JSON.parse(await readFile("tests/fixtures/klasse-7a.json", "utf8"));
    const dx = 2, dy = 3;
    roh.tables.forEach((t) => { t.x += dx; t.y += dy; });
    roh.room.furniture.forEach((f) => { f.x += dx; f.y += dy; });
    roh.room.cols += dx + 2;
    roh.room.rows += dy + 2;
    const datei = join(await mkdtemp(join(tmpdir(), "sitzplan-")), "verschoben.json");
    await writeFile(datei, JSON.stringify(roh), "utf8");
    await page.emulateMedia({ media: "screen" });
    await laden(page, datei);
    const verschoben = (await seiten(page)).seiten[1];

    expect(Math.abs(verschoben.plan.b - normal.plan.b)).toBeLessThan(0.6);
    expect(Math.abs(verschoben.plan.h - normal.plan.h)).toBeLessThan(0.6);
  });

  test("kleiner Raum wird hochskaliert und bleibt mittig", async ({ page }) => {
    const roh = JSON.parse(await readFile("tests/fixtures/klasse-7a.json", "utf8"));
    roh.tables = roh.tables.slice(0, 3);
    const datei = join(await mkdtemp(join(tmpdir(), "sitzplan-")), "klein.json");
    await writeFile(datei, JSON.stringify(roh), "utf8");
    await page.goto("/");
    await page.setInputFiles("#fileIn", datei);
    await expect(page.locator("#planName")).toHaveValue("Testklasse 7a");
    const { seiten: s } = await seiten(page);
    for (const sp of s) {
      expect(Math.abs(sp.links - sp.rechts)).toBeLessThan(0.3);
      expect(Math.abs(sp.oben - sp.unten)).toBeLessThan(0.3);
      expect(sp.plan.b).toBeLessThanOrEqual(sp.seite.b + 0.1);
      expect(sp.plan.h).toBeLessThanOrEqual(sp.seite.h + 0.1);
    }
    // deutlich größer als die Plätze im vollen Raum (dort ca. 20 mm je Platz)
    const platz = await page.evaluate((faktor) => document.querySelector("#printSheet .pseat").getBoundingClientRect().width * faktor, MM);
    expect(platz).toBeGreaterThan(30);
  });

  test("Überschrift steht im Rand, nicht im Plan", async ({ page }) => {
    await laden(page);
    const { seiten: s } = await seiten(page);
    expect(s[0].kopf).toContain("Lehrersicht");
    expect(s[1].kopf).toContain("Schülersicht");
    // der Plan beginnt unterhalb der Überschrift (die liegt 7 mm über dem bedruckbaren Bereich)
    expect(s[0].inhaltOben).toBeGreaterThanOrEqual(0);
  });
});
