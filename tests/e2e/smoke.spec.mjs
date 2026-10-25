// Browser-Smoke-Test: die Hauptwege der App von außen, ohne Kenntnis des Codes.
// Muss gegen die Ausgangsfassung (v3.3) und gegen den Umbau gleichermaßen grün sein.
import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NAMEN = [
  "Anna Adler", "Ben Braun", "Clara Conrad", "David Dietz", "Elif Engel", "Felix Fuchs",
  "Greta Graf", "Hannes Hahn", "Ida Imhof", "Jonas Jung", "Kira Kunz", "Leon Lang",
  "Mia Maier", "Noah Nagel", "Olivia Ott", "Paul Pohl", "Quentin Quast", "Rosa Roth",
  "Sami Sauer", "Tina Thiel", "Uwe Ullrich", "Vera Voss", "Wim Wolf", "Yara Yilmaz",
];

async function oeffne(page) {
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) fehler.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) fehler.push(r.status() + " " + r.url());
  });
  await page.goto("/");
  await expect(page.locator("#room .seat").first()).toBeVisible();
  return fehler;
}

async function klasseEinfuegen(page, namen = NAMEN) {
  await page.locator("#tabBtnClass").click();
  await page.locator("#bulk").fill(namen.join(", "));
  await page.locator("#bulkAdd").click();
  await expect(page.locator("#toasts")).toContainText(namen.length + " Schüler:innen hinzugefügt");
  await page.locator("#tabBtnPlan").click();
}

const besetzt = (page) => page.locator('#room .seat:not([aria-label^="freier Platz"]):not(.blocked)');

async function anordnen(page) {
  await page.locator("#btnGen").click();
  await expect(besetzt(page)).toHaveCount(NAMEN.length);
}

async function sicherungHerunterladen(page, passwort) {
  await page.locator("#btnMenu").click();
  await page.locator("#btnJson").click();
  if (passwort) {
    await page.locator("#sgKrypt").check();
    await page.locator("#sgPw1").fill(passwort);
    await page.locator("#sgPw2").fill(passwort);
  }
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#sgGo").click()]);
  const ordner = await mkdtemp(join(tmpdir(), "sitzplan-"));
  const pfad = join(ordner, download.suggestedFilename());
  await download.saveAs(pfad);
  return pfad;
}

async function neuerLeererPlan(page) {
  await page.locator("#btnMenu").click();
  await page.locator("#btnNew").click();
  await page.locator("#cYes").click();
  await expect(besetzt(page)).toHaveCount(0);
}

test("startet ohne Fehler und zeigt den Standardraum", async ({ page }) => {
  const fehler = await oeffne(page);
  await expect(page).toHaveTitle("Sitzplan-Generator");
  await expect(page.locator("#planName")).toHaveValue("Sitzplan");
  await expect(page.locator("#room .seat")).toHaveCount(30);
  expect(fehler).toEqual([]);
});

test("Klasse einfügen, anordnen, speichern und nach Neuladen wiederfinden", async ({ page }) => {
  const fehler = await oeffne(page);
  await klasseEinfuegen(page);
  await anordnen(page);
  await expect(page.locator("#upCount")).toHaveText("0");
  await expect(page.locator("#saveStatus .ss-txt")).toHaveText("Gespeichert");
  await page.reload();
  await expect(besetzt(page)).toHaveCount(NAMEN.length);
  expect(fehler).toEqual([]);
});

test("Rückgängig und Wiederholen", async ({ page }) => {
  await oeffne(page);
  await klasseEinfuegen(page);
  await anordnen(page);
  await page.locator("#btnUndo").click();
  await expect(besetzt(page)).toHaveCount(0);
  await page.locator("#btnRedo").click();
  await expect(besetzt(page)).toHaveCount(NAMEN.length);
});

test("Tausch per Antippen: zwei Plätze antippen tauscht die Personen", async ({ page }) => {
  await oeffne(page);
  await klasseEinfuegen(page);
  await anordnen(page);
  const plaetze = besetzt(page);
  const a = await plaetze.nth(0).getAttribute("aria-label");
  const b = await plaetze.nth(1).getAttribute("aria-label");
  const nameA = a.split(",")[0];
  const nameB = b.split(",")[0];
  await plaetze.nth(0).click();
  await plaetze.nth(1).click();
  await expect(page.locator(`#room .seat[aria-label^="${nameA},"]`)).toHaveCount(1);
  const neuA = await page.locator(`#room .seat[aria-label^="${nameA},"]`).getAttribute("aria-label");
  const neuB = await page.locator(`#room .seat[aria-label^="${nameB},"]`).getAttribute("aria-label");
  expect(neuA.split(",").slice(1).join(",")).toBe(b.split(",").slice(1).join(","));
  expect(neuB.split(",").slice(1).join(",")).toBe(a.split(",").slice(1).join(","));
});

test("Sicherung herunterladen, neuen Plan beginnen, Sicherung wieder öffnen", async ({ page }) => {
  await oeffne(page);
  await klasseEinfuegen(page);
  await anordnen(page);
  const pfad = await sicherungHerunterladen(page);
  const inhalt = JSON.parse(await readFile(pfad, "utf8"));
  expect(inhalt.format).toBe("sitzplan-sicherung");
  expect(inhalt.students).toHaveLength(NAMEN.length);
  expect(Object.keys(inhalt.arrangement)).toHaveLength(NAMEN.length);
  await neuerLeererPlan(page);
  await page.setInputFiles("#fileIn", pfad);
  await expect(besetzt(page)).toHaveCount(NAMEN.length);
});

test("verschlüsselte Sicherung: falsches Passwort wird abgelehnt, richtiges öffnet", async ({ page }) => {
  await oeffne(page);
  await klasseEinfuegen(page);
  await anordnen(page);
  const pfad = await sicherungHerunterladen(page, "Geheim-1234");
  const inhalt = JSON.parse(await readFile(pfad, "utf8"));
  expect(inhalt.verschluesselt).toBe(true);
  expect(JSON.stringify(inhalt)).not.toContain("Anna");
  await neuerLeererPlan(page);
  await page.setInputFiles("#fileIn", pfad);
  await page.locator("#soPw").fill("falsch");
  await page.locator("#soGo").click();
  await expect(page.locator("#toasts")).toContainText("Passwort falsch");
  await page.locator("#soPw").fill("Geheim-1234");
  await page.locator("#soGo").click();
  await expect(besetzt(page)).toHaveCount(NAMEN.length);
});

test("Raum-Bereich, Klassen-Bereich und Anleitung lassen sich öffnen", async ({ page }) => {
  const fehler = await oeffne(page);
  await page.locator("#tabBtnRoom").click();
  await expect(page.locator('[aria-label="Raum-Werkzeuge"]')).toBeVisible();
  await page.locator("#tabBtnClass").click();
  await expect(page.locator("#bulk")).toBeVisible();
  await page.locator("#btnHelp").click();
  await expect(page.locator("#helpPane")).toContainText("Schnellstart");
  expect(fehler).toEqual([]);
});

test("Druckauswahl öffnet und schließt", async ({ page }) => {
  await oeffne(page);
  await page.locator("#btnMenu").click();
  await page.locator("#mPrint").click();
  await expect(page.locator("#ov")).toBeVisible();
  await expect(page.locator("#modalBody")).toContainText("Schülersicht");
  await page.keyboard.press("Escape");
  await expect(page.locator("#ov")).toBeHidden();
});

test("Beamer-Modus an und aus", async ({ page }) => {
  await oeffne(page);
  await page.locator("#btnBeamer").click();
  await expect(page.locator("#btnBeamerExit")).toBeVisible();
  await page.locator("#btnBeamerExit").click();
  await expect(page.locator("#btnBeamerExit")).toBeHidden();
});

test("Ansichtswechsel Lehrersicht/Schülersicht", async ({ page }) => {
  await oeffne(page);
  await page.locator("#vStudent").click();
  await expect(page.locator("#vStudent")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#vTeacher").click();
  await expect(page.locator("#vTeacher")).toHaveAttribute("aria-pressed", "true");
});

test("Liste aus CSV-Datei einlesen", async ({ page }) => {
  await oeffne(page);
  await page.locator("#tabBtnClass").click();
  const ordner = await mkdtemp(join(tmpdir(), "sitzplan-"));
  const csv = join(ordner, "klasse.csv");
  await writeFile(csv, "Nachname;Vorname\nSchmidt;Lena\nWeber;Tom\nKraus;Ida\n", "utf8");
  await page.setInputFiles("#listIn", csv);
  await expect(page.locator("#ov")).toBeVisible();
  await expect(page.locator("#modalBody")).toContainText("Lena");
});
