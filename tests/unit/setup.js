// Testumgebung: das echte HTML-Gerüst der App in jsdom bereitstellen, damit die Module
// (die beim Laden Knöpfe verdrahten) so starten wie im Browser.
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const html = readFileSync("app/index.html", "utf8");
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf('<script type="module"'));
document.body.innerHTML = body;

if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (!window.crypto || !window.crypto.subtle) {
  Object.defineProperty(window, "crypto", { value: webcrypto, configurable: true });
}
Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
window.TextEncoder = globalThis.TextEncoder;
window.HTMLElement.prototype.scrollIntoView = function () {};
