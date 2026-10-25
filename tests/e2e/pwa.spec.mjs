// Installierbarkeit und Offline-Betrieb (PC und iPad-Ansichten)
import { test, expect } from "@playwright/test";

test("Manifest, Symbole und iOS-Angaben sind vorhanden und erreichbar", async ({ page, request, baseURL }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(new URL(href, baseURL).href)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("./");
  expect(manifest.icons.some((i) => i.sizes === "192x192")).toBe(true);
  expect(manifest.icons.some((i) => i.sizes === "512x512")).toBe(true);
  expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) {
    const r = await request.get(new URL(icon.src, new URL(href, baseURL)).href);
    expect(r.status(), icon.src).toBe(200);
  }
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect((await request.get(new URL(touch, baseURL).href)).status()).toBe(200);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
});

test("startet nach dem ersten Besuch auch ohne Netz und behält den Plan", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.locator("#tabBtnClass").click();
  await page.locator("#bulk").fill("Anna Adler, Ben Braun, Clara Conrad");
  await page.locator("#bulkAdd").click();
  await expect(page.locator("#toasts")).toContainText("3 Schüler:innen hinzugefügt");
  await expect(page.locator("#saveStatus .ss-txt")).toHaveText("Gespeichert");
  // Die Seite muss vom Service Worker kontrolliert werden, bevor das Netz wegfällt
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#room .seat").first()).toBeVisible();
  await page.locator("#tabBtnClass").click();
  const werte = await page.locator("#stuList").evaluate((n) => [...n.querySelectorAll("input")].map((i) => i.value));
  expect(werte).toEqual(expect.arrayContaining(["Anna", "Ben", "Clara"]));
  await context.setOffline(false);
});

test("Hilfe nennt Version und Installation", async ({ page }) => {
  await page.goto("/");
  await page.locator("#btnHelp").click();
  await expect(page.locator("#helpPane")).toContainText(/Version \d+\.\d+\.\d+/);
  await expect(page.locator("#helpPane")).toContainText("Zum Home-Bildschirm");
});
