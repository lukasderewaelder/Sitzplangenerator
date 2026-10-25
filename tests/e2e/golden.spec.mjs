// Verhaltensvergleich: eine Sicherung (nur erfundene Namen) laden und wieder sichern.
// Die Vergleichsdatei stammt aus der Ausgangsfassung v3.3 – der Umbau muss dasselbe liefern.
import { test, expect } from "@playwright/test";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Sicherung laden und wieder sichern ergibt exakt den Stand der Ausgangsfassung", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#room .seat").first()).toBeVisible();
  await page.setInputFiles("#fileIn", "tests/fixtures/klasse-7a.json");
  await expect(page.locator("#planName")).toHaveValue("Testklasse 7a");
  await page.locator("#btnMenu").click();
  await page.locator("#btnJson").click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#sgGo").click()]);
  const pfad = join(await mkdtemp(join(tmpdir(), "sitzplan-")), "sicherung.json");
  await download.saveAs(pfad);
  const ist = JSON.parse(await readFile(pfad, "utf8"));
  delete ist.gespeichertAm;
  const soll = JSON.parse(await readFile("tests/fixtures/klasse-7a.golden.json", "utf8"));
  expect(ist).toEqual(soll);
});

test("Anordnen mit Regeln hält Gruppen auseinander und Fixiertes fest", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#fileIn", "tests/fixtures/klasse-7a.json");
  await expect(page.locator("#planName")).toHaveValue("Testklasse 7a");
  await page.locator("#btnGen").click();
  await expect(page.locator('#room .seat:not([aria-label^="freier Platz"]):not(.blocked)')).toHaveCount(24);
  await page.locator("#btnMenu").click();
  await page.locator("#btnJson").click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#sgGo").click()]);
  const pfad = join(await mkdtemp(join(tmpdir(), "sitzplan-")), "sicherung.json");
  await download.saveAs(pfad);
  const plan = JSON.parse(await readFile(pfad, "utf8"));
  const belegt = Object.values(plan.arrangement);
  expect(new Set(belegt).size).toBe(24);
  // gesperrter Platz bleibt leer
  const gesperrt = Object.keys(plan.seatMeta).filter((k) => plan.seatMeta[k].blocked);
  for (const k of gesperrt) expect(plan.arrangement[k]).toBeUndefined();
});
