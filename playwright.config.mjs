import { defineConfig } from "@playwright/test";

// Die Browser-Tests laufen gegen den gebauten Stand im Repo-Stamm (index.html).
// Mit SMOKE_ROOT lässt sich ein anderer Ordner prüfen, z. B. die Ausgangsfassung.
const wurzel = process.env.SMOKE_ROOT || ".";
const port = Number(process.env.SMOKE_PORT) || 4175;
// CI hat Chromium von Playwright; auf dem lokalen Rechner genügt das installierte Edge.
const kanal = process.env.PW_CHANNEL ?? (process.env.CI ? undefined : "msedge");

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}/`, channel: kanal, trace: "retain-on-failure" },
  webServer: {
    command: `node tools/serve.mjs ${wurzel} ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "pc", use: { viewport: { width: 1440, height: 900 } } },
    { name: "ipad-quer", use: { viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: "ipad-hoch", use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
  ],
});
